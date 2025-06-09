import { GEMINI_MODELS } from "@/lib/gemini";
import { createBookmarkAction, getBookmarkAction, searchBookmarksAction } from "@/lib/actions/chat.action";
import { streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: GEMINI_MODELS.normal,
    messages,
    maxSteps: 5,
    tools: {
      createBookmark: tool({
        description: "Create a new bookmark for a URL. Use this when the user wants to save a webpage, article, or any URL to their bookmarks.",
        parameters: z.object({
          url: z.string().url().describe("The URL to bookmark"),
        }),
        execute: async ({ url }) => {
          const result = await createBookmarkAction({ url });
          return result;
        },
      }),
      searchBookmarks: tool({
        description: "Search through the user's bookmarks using a query. Use this to help users find specific bookmarks based on content, title, or tags.",
        parameters: z.object({
          query: z.string().describe("The search query to find bookmarks"),
          tags: z.array(z.string()).optional().describe("Optional tags to filter the search"),
          limit: z.number().min(1).max(20).optional().default(10).describe("Number of results to return (default: 10, max: 20)"),
        }),
        execute: async ({ query, tags, limit }) => {
          const result = await searchBookmarksAction({ query, tags, limit });
          return result;
        },
      }),
      getBookmark: tool({
        description: "Get detailed information about a specific bookmark by its ID. Use this when you need to show full details of a particular bookmark.",
        parameters: z.object({
          id: z.string().describe("The unique ID of the bookmark"),
        }),
        execute: async ({ id }) => {
          const result = await getBookmarkAction({ id });
          return result;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}