// httpActions MUST run in the default (V8) runtime — never "use node".
// The Vercel AI SDK (streamText + @ai-sdk/google) is fetch-based and runs in V8.
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { authComponent, createAuth } from "../auth/config";
import { withGeminiFallback } from "../lib/gemini_provider";

// ---------------------------------------------------------------------------
// System prompt (verbatim from Spec 06 §2.1)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You help users find their bookmarks. Be MINIMAL, EFFICIENT, and STRICT about relevance.

<STRICT_RULES>
1. NEVER write lists or descriptions of bookmarks in text - the user CANNOT see them
2. ALWAYS use showBookmarks to display results - this is the ONLY way users see bookmarks
3. Call showBookmarks ONCE with all relevant IDs - never multiple times
4. Keep text responses to 1-2 SHORT sentences max
5. Do 2-3 searches max, then show results
</STRICT_RULES>

<RELEVANCE_FILTERING>
BE EXTREMELY PICKY about what you show. Only include bookmarks that DIRECTLY answer the user's specific query:
- If user asks for "X about Y", the bookmark MUST be specifically about Y, not just mention X
- Read the title AND summary carefully - vague matches are NOT good enough
- A bookmark about "Claude Code usage" does NOT match "Claude Code prompts" - they are different topics
- When in doubt, EXCLUDE the result. Showing fewer highly-relevant results is better than many loosely-related ones
- Example: "tweets about Claude Code prompts" -> ONLY show tweets that discuss actual prompts/instructions for Claude Code, NOT general Claude Code tips or experiences
</RELEVANCE_FILTERING>

<workflow>
1. Search (2-3 queries max with different keywords)
2. FILTER STRICTLY: Read each result's title+summary and ONLY keep those that directly match the user's specific query intent
3. Call showBookmarks ONCE with those filtered IDs (may be fewer than search returned - that's good)
4. Add ONE short sentence of context (optional)
</workflow>

<tools>
- searchBookmarks: Internal search (user sees NOTHING - only for your analysis)
  - filters: types (TWEET/YOUTUBE/VIDEO/ARTICLE/PAGE/IMAGE/PDF/PRODUCT), tags, status (READ/UNREAD/STAR)
- showBookmarks: Display bookmarks to user (pass IDs + optional title) - ONLY WAY to show bookmarks
- showBookmark: Display single bookmark
- getBookmark: Get bookmark details (internal)
- updateTags: Add/remove tags
- downloadBookmarks: Generate a downloadable file (CSV or JSON) from bookmark IDs. User sees a download button. Use when user asks to export/download/save bookmarks to a file.
</tools>

<FORBIDDEN>
- Writing bookmark titles/descriptions in your text response
- Making bullet lists of bookmarks
- Calling showBookmarks multiple times
- Long explanations - be concise
- More than 3 search queries
- Showing loosely-related results that don't specifically answer the query
</FORBIDDEN>

<example>
User: "find react tutorials"
You: search("react tutorial") + search("react guide")
You: [Read results, filter to only actual tutorials, exclude React news or articles that just mention React]
You: showBookmarks([id1, id2, id3], "React Tutorials")
You: "Here are your React tutorials."
</example>`;

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  messages: z.array(z.any()),
  enableThinking: z.boolean().optional().default(false),
  conversationId: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Thinking config helper
// ---------------------------------------------------------------------------

type ThinkingConfig = {
  providerOptions?: {
    google?: GoogleGenerativeAIProviderOptions;
  };
};

function getThinkingConfig(enableThinking: boolean): ThinkingConfig {
  if (!enableThinking) return {};
  return {
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8192,
          includeThoughts: true,
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// CSV escape helper
// ---------------------------------------------------------------------------

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// ---------------------------------------------------------------------------
// HTTP action
// ---------------------------------------------------------------------------

export const chatStreamHandler = httpAction(async (ctx, request) => {
  // ---- CORS preflight (handled in http.ts but just in case) ----
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // ---- Auth ----
  let userId: string | undefined;
  try {
    const user = await authComponent.safeGetAuthUser(ctx);
    userId = user?._id;

    if (!userId) {
      const { auth } = await authComponent.getAuth(createAuth, ctx);
      const session = await auth.api.getSession({ headers: request.headers });
      userId = session?.user?.id;
    }
  } catch {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders(),
    });
  }
  if (!userId) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders(),
    });
  }

  // ---- Parse + validate request body ----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body", success: false },
      { status: 400, headers: corsHeaders() },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.message, success: false },
      { status: 400, headers: corsHeaders() },
    );
  }

  const { messages, enableThinking, conversationId } = parsed.data;

  // ---- Atomic check + increment chat usage ----
  try {
    await ctx.runMutation(internal.chat.mutations.checkAndIncrementUsage, {
      userId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Chat limit reached.";
    return Response.json(
      { error: message, success: false },
      { status: 429, headers: corsHeaders() },
    );
  }

  // ---- Build tools (userId bound in closure) ----
  const bookmarkTypeEnum = z.enum([
    "VIDEO",
    "ARTICLE",
    "PAGE",
    "IMAGE",
    "YOUTUBE",
    "TWEET",
    "PDF",
    "PRODUCT",
  ]);
  const specialFilterEnum = z.enum(["READ", "UNREAD", "STAR"]);

  const tools = {
    searchBookmarks: tool({
      description: `Internal search tool - search through bookmarks and return results for YOUR analysis. Results are NOT displayed to the user. Use this to find relevant bookmarks, then call showBookmarks to display them.

You can filter by:
- types: VIDEO, ARTICLE, PAGE, IMAGE, YOUTUBE, TWEET, PDF, PRODUCT
- tags: array of tag names to filter by
- filters: READ (already read), UNREAD (not read yet), STAR (starred/favorite)`,
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query to find relevant bookmarks"),
        limit: z
          .number()
          .optional()
          .default(6)
          .describe("Maximum number of results to return"),
        types: z
          .array(bookmarkTypeEnum)
          .optional()
          .describe("Filter by bookmark types"),
        tags: z.array(z.string()).optional().describe("Filter by tag names"),
        filters: z
          .array(specialFilterEnum)
          .optional()
          .describe("Special filters: READ, UNREAD, STAR"),
      }),
      execute: async ({ query, limit, types, tags, filters }) => {
        type SearchResult = {
          _id?: string;
          id?: string;
          url: string;
          type?: string | null;
          title?: string | null;
          summary?: string | null;
          ogImageUrl?: string | null;
          ogDescription?: string | null;
          metadata?: unknown;
          starred?: boolean;
          read?: boolean;
          status?: string;
          faviconUrl?: string | null;
          preview?: string | null;
          createdAt?: number;
          tags?: unknown[];
        };

        const results = (await ctx.runAction(
          internal.search.actions.searchForChat,
          {
            userId,
            query,
            matchingDistance: 0.8,
            types: types as
              | (
                  | "VIDEO"
                  | "ARTICLE"
                  | "PAGE"
                  | "IMAGE"
                  | "YOUTUBE"
                  | "TWEET"
                  | "PDF"
                  | "PRODUCT"
                )[]
              | undefined,
            tags,
            specialFilters: filters as
              | ("READ" | "UNREAD" | "STAR")[]
              | undefined,
          },
        )) as { bookmarks: SearchResult[] };

        const bookmarks = Array.isArray(results)
          ? (results as SearchResult[])
          : ((results as { bookmarks?: SearchResult[] })?.bookmarks ?? []);

        const limitedResults = bookmarks.slice(0, Math.min(limit ?? 6, 20));

        return limitedResults.map((bookmark) => ({
          id: bookmark._id ?? bookmark.id,
          url: bookmark.url,
          type: bookmark.type,
          title: bookmark.title,
          summary: bookmark.summary,
          ogImageUrl: bookmark.ogImageUrl,
          ogDescription: bookmark.ogDescription,
          metadata: bookmark.metadata,
          starred: bookmark.starred ?? false,
          read: bookmark.read ?? false,
          status: bookmark.status,
          faviconUrl: bookmark.faviconUrl,
          preview: bookmark.preview,
          createdAt: bookmark.createdAt,
          tags: bookmark.tags,
        }));
      },
    }),

    getBookmark: tool({
      description:
        "Get detailed information about a specific bookmark by its ID. Returns full bookmark data including tags, notes, and metadata.",
      inputSchema: z.object({
        id: z.string().describe("The bookmark ID to retrieve"),
      }),
      execute: async ({ id }) => {
        // Convex IDs are strings; cast for the internal query.
        type BookmarkDetail = {
          _id?: string;
          id?: string;
          url: string;
          type?: string | null;
          title?: string | null;
          summary?: string | null;
          ogImageUrl?: string | null;
          metadata?: unknown;
          starred?: boolean;
          read?: boolean;
          status?: string;
          faviconUrl?: string | null;
          preview?: string | null;
          note?: string | null;
          createdAt?: number;
          updatedAt?: number;
          tags?: unknown[];
        } | null;

        const bookmark = (await ctx.runQuery(
          internal.bookmarks.queries.getById,
          {
            id: id as never,
            userId,
          },
        )) as BookmarkDetail;

        if (!bookmark) return { error: "Bookmark not found" };

        return {
          id: bookmark._id ?? bookmark.id,
          url: bookmark.url,
          type: bookmark.type,
          title: bookmark.title,
          summary: bookmark.summary,
          ogImageUrl: bookmark.ogImageUrl,
          metadata: bookmark.metadata,
          starred: bookmark.starred,
          read: bookmark.read,
          status: bookmark.status,
          faviconUrl: bookmark.faviconUrl,
          preview: bookmark.preview,
          note: bookmark.note,
          createdAt: bookmark.createdAt,
          updatedAt: bookmark.updatedAt,
          tags: bookmark.tags,
        };
      },
    }),

    showBookmarks: tool({
      description:
        "Display a grid of bookmark cards to the user. Pass the bookmark IDs from your search results. The server will fetch and display them.",
      inputSchema: z.object({
        bookmarkIds: z
          .array(z.string())
          .describe("Array of bookmark IDs to display"),
        title: z
          .string()
          .optional()
          .describe("Optional title to display above the grid"),
      }),
      execute: async ({ bookmarkIds, title }) => {
        type BookmarkItem = {
          _id?: string;
          id?: string;
          url: string;
          type?: string | null;
          title?: string | null;
          summary?: string | null;
          ogImageUrl?: string | null;
          metadata?: unknown;
          starred?: boolean;
          read?: boolean;
          status?: string;
          faviconUrl?: string | null;
          preview?: string | null;
          createdAt?: number;
          tags?: unknown[];
        };

        const bookmarks = (await ctx.runQuery(
          internal.bookmarks.queries.listByIds,
          {
            ids: bookmarkIds as never[],
            userId,
          },
        )) as BookmarkItem[];

        return {
          bookmarks: bookmarks.map((b) => ({
            id: b._id ?? b.id,
            url: b.url,
            type: b.type,
            title: b.title,
            summary: b.summary,
            ogImageUrl: b.ogImageUrl,
            metadata: b.metadata,
            starred: b.starred,
            read: b.read,
            status: b.status,
            faviconUrl: b.faviconUrl,
            preview: b.preview,
            createdAt: b.createdAt,
            tags: b.tags,
          })),
          title,
        };
      },
    }),

    showBookmark: tool({
      description:
        "Display a single bookmark card with full details to the user. Pass the bookmark ID and the server will fetch and display it.",
      inputSchema: z.object({
        bookmarkId: z.string().describe("The bookmark ID to display"),
      }),
      execute: async ({ bookmarkId }) => {
        type BookmarkDetail = {
          _id?: string;
          id?: string;
          url: string;
          type?: string | null;
          title?: string | null;
          summary?: string | null;
          ogImageUrl?: string | null;
          metadata?: unknown;
          starred?: boolean;
          read?: boolean;
          status?: string;
          faviconUrl?: string | null;
          preview?: string | null;
          note?: string | null;
          createdAt?: number;
          tags?: unknown[];
        } | null;

        const bookmark = (await ctx.runQuery(
          internal.bookmarks.queries.getById,
          {
            id: bookmarkId as never,
            userId,
          },
        )) as BookmarkDetail;

        if (!bookmark) return { error: "Bookmark not found" };

        return {
          bookmark: {
            id: bookmark._id ?? bookmark.id,
            url: bookmark.url,
            type: bookmark.type,
            title: bookmark.title,
            summary: bookmark.summary,
            ogImageUrl: bookmark.ogImageUrl,
            metadata: bookmark.metadata,
            starred: bookmark.starred,
            read: bookmark.read,
            status: bookmark.status,
            faviconUrl: bookmark.faviconUrl,
            preview: bookmark.preview,
            note: bookmark.note,
            createdAt: bookmark.createdAt,
            tags: bookmark.tags,
          },
        };
      },
    }),

    updateTags: tool({
      description:
        "Add or remove tags from one or more bookmarks. Use this to organize bookmarks by adding relevant tags or removing irrelevant ones.",
      inputSchema: z.object({
        bookmarkIds: z
          .array(z.string())
          .describe("Array of bookmark IDs to update"),
        add: z
          .array(z.string())
          .optional()
          .describe("Tag names to add to the bookmarks"),
        remove: z
          .array(z.string())
          .optional()
          .describe("Tag names to remove from the bookmarks"),
      }),
      execute: async ({ bookmarkIds, add = [], remove = [] }) => {
        if (bookmarkIds.length === 0)
          return { error: "No bookmark IDs provided" };
        if (add.length === 0 && remove.length === 0)
          return { error: "No tags to add or remove" };

        // Delegate to the internal applyTagsDiff mutation (transactional).
        const result = (await ctx.runMutation(
          internal.chat.mutations.applyTagsDiff,
          {
            bookmarkIds,
            add: add.filter(Boolean),
            remove: remove.filter(Boolean),
            userId,
          },
        )) as {
          success: boolean;
          bookmarksUpdated: number;
          tagsAdded: number;
          tagsRemoved: number;
          addedTags: string[];
          removedTags: string[];
        };

        if (result.bookmarksUpdated === 0) {
          return { error: "No bookmarks found with the provided IDs" };
        }

        return result;
      },
    }),

    downloadBookmarks: tool({
      description:
        "Generate a downloadable file (CSV or JSON) containing specific bookmarks. The user will see a download button they can click. Use this after searching when the user asks to export, download, or save their bookmarks to a file.",
      inputSchema: z.object({
        bookmarkIds: z
          .array(z.string())
          .describe("Array of bookmark IDs to include in the download"),
        filename: z
          .string()
          .optional()
          .describe("Custom filename without extension"),
        format: z
          .enum(["csv", "json"])
          .optional()
          .default("csv")
          .describe("File format: csv or json"),
      }),
      execute: async ({ bookmarkIds, filename, format }) => {
        if (bookmarkIds.length === 0)
          return { error: "No bookmark IDs provided" };

        type BookmarkItem = {
          _id?: string;
          id?: string;
          url: string;
          type?: string | null;
          title?: string | null;
          summary?: string | null;
          ogDescription?: string | null;
          starred?: boolean;
          createdAt?: number;
          tags?: Array<{ tag: { name: string } }>;
        };

        const bookmarks = (await ctx.runQuery(
          internal.bookmarks.queries.listByIds,
          {
            ids: bookmarkIds as never[],
            userId,
          },
        )) as BookmarkItem[];

        if (bookmarks.length === 0) return { error: "No bookmarks found" };

        const baseName =
          filename || `bookmarks-${new Date().toISOString().split("T")[0]}`;

        const mapped = bookmarks.map((b) => ({
          title: b.title ?? "",
          url: b.url,
          type: b.type ?? "",
          summary: b.summary ?? "",
          description: b.ogDescription ?? "",
          tags: (b.tags ?? []).map((t) => t.tag.name).join(", "),
          starred: b.starred ?? false,
          createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : "",
        }));

        let content: string;
        let ext: string;
        let mimeType: string;

        if (format === "json") {
          content = JSON.stringify(mapped, null, 2);
          ext = "json";
          mimeType = "application/json";
        } else {
          const header =
            "title,url,type,summary,description,tags,starred,createdAt\n";
          const rows = mapped
            .map((row) =>
              [
                escapeCsvField(row.title),
                escapeCsvField(row.url),
                escapeCsvField(row.type),
                escapeCsvField(row.summary),
                escapeCsvField(row.description),
                escapeCsvField(row.tags),
                row.starred ? "true" : "false",
                row.createdAt,
              ].join(","),
            )
            .join("\n");
          content = header + rows;
          ext = "csv";
          mimeType = "text/csv";
        }

        return {
          content,
          filename: `${baseName}.${ext}`,
          mimeType,
          format: ext,
          bookmarkCount: bookmarks.length,
        };
      },
    }),
  };

  // ---- Stream text ----
  const thinkingConfig = getThinkingConfig(enableThinking);

  const result = await withGeminiFallback(async (google) =>
    streamText({
      model: google("gemini-3.1-pro-preview"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages as UIMessage[]),
      tools,
      stopWhen: stepCountIs(20),
      providerOptions: thinkingConfig.providerOptions,
      onFinish: async ({ response }) => {
        // Persist messages if a conversationId was provided.
        if (conversationId) {
          try {
            await ctx.runMutation(internal.chat.mutations.addMessages, {
              conversationId: conversationId as never,
              userId,
              messages: response.messages,
            });
          } catch (err) {
            console.warn("[chat.stream] addMessages failed", err);
          }
        }
      },
    }),
  );

  const streamResponse = result.toUIMessageStreamResponse({
    originalMessages: messages as UIMessage[],
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    sendReasoning: enableThinking,
  });

  // Add CORS headers to the streaming response.
  const headers = new Headers(streamResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }

  return new Response(streamResponse.body, {
    status: streamResponse.status,
    headers,
  });
});

// ---------------------------------------------------------------------------
// CORS helper
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  const siteUrl = process.env.SITE_URL ?? "*";
  return {
    "Access-Control-Allow-Origin": siteUrl,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
