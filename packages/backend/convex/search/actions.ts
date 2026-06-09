"use node";

/**
 * search/actions.ts — "use node" actions for the search module.
 *
 * Requires "use node" because:
 *   - ctx.vectorSearch is only available in actions (E.6)
 *   - @ai-sdk/google requires Node.js runtime for embedQuery
 *
 * NO queries or mutations may be defined in this file.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authAction } from "../functions";
import { bookmarkType } from "../schema";
import {
  applyOpenFrequencyBoost,
  bookmarkToSearchResult,
  extractDomain,
  isDomainQuery,
  isSearchQuery,
  paginateResults,
  sortSearchResults,
  type SearchResultDTO,
} from "./helpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536";

// ---------------------------------------------------------------------------
// Local embedQuery (mirrors processing/embeddings.ts embedQuery but for search)
// ---------------------------------------------------------------------------

async function embedQueryLocal(text: string): Promise<number[]> {
  const { embed } = await import("ai");
  const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

  const google = createGoogleGenerativeAI({});

  const result = await embed({
    model: google.embeddingModel("gemini-embedding-2"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: 1536,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });

  return result.embedding;
}

// ---------------------------------------------------------------------------
// Shared search response type
// ---------------------------------------------------------------------------

type SearchResponse = {
  bookmarks: SearchResultDTO[];
  nextCursor?: string;
  hasMore: boolean;
  queryTime?: number;
  fromCache: false;
};

// ---------------------------------------------------------------------------
// Vector search core (shared between `search` and `searchForChat`)
// ---------------------------------------------------------------------------

async function runVectorSearch(
  ctx: any,
  userId: string,
  query: string,
  matchingDistance: number,
  limit: number,
  cursor: string | undefined,
  tags: string[],
  types: string[],
  specialFilters: ("READ" | "UNREAD" | "STAR")[],
): Promise<SearchResponse> {
  const startTime = Date.now();

  // 1. Embed the query
  const vector = await embedQueryLocal(query.trim());

  // 2. Vector search — always filter by userId; embeddingModel filter is post
  const rawResults: Array<{ _id: string; _score: number }> =
    await ctx.vectorSearch("bookmarks", "by_search_embedding", {
      vector,
      limit: 50,
      filter: (q: any) => q.eq("userId", userId),
    });

  // 3. Post-filter by embeddingModel (schema has it as filterField but we
  //    post-filter for safety since we don't know if the index filterField is used
  //    consistently across all documents).
  const filteredResults = rawResults.filter(
    (r: any) => r._score !== undefined,
  );
  // We do not filter by embeddingModel here at vector-search level since Convex
  // index filterFields includes "embeddingModel"; we will re-check after loading docs.

  // Helper: apply matchingDistance spread filter
  const applySpread = (
    items: Array<{ _id: string; _score: number }>,
    spread: number,
  ) => {
    if (items.length === 0) return [];
    const maxScore = items[0]!._score;
    return items.filter((r) => r._score >= maxScore - spread);
  };

  // 4. Three-level fallback
  let spreadResults = applySpread(filteredResults, matchingDistance);

  if (spreadResults.length === 0 && filteredResults.length > 0) {
    // Fallback 1: widen spread to 1.0
    spreadResults = applySpread(filteredResults, 1.0);
  }

  if (spreadResults.length === 0 && filteredResults.length > 0) {
    // Fallback 2: no spread, return all raw results
    spreadResults = filteredResults;
  }

  if (spreadResults.length === 0) {
    return {
      bookmarks: [],
      hasMore: false,
      fromCache: false,
      queryTime: Date.now() - startTime,
    };
  }

  // 5. Load bookmark docs (with ownership re-check)
  const ids = spreadResults.map((r) => r._id) as any[];
  const docs: any[] = await ctx.runQuery(internal.search.queries.loadForSearch, {
    ids,
    userId,
  });

  // 6. Build a score map
  const scoreMap = new Map<string, number>(
    spreadResults.map((r) => [r._id, r._score]),
  );

  // 7. Get open counts
  const docIds = docs.map((d: any) => d._id) as any[];
  const openCountItems: Array<{ bookmarkId: string; openCount: number }> =
    await ctx.runQuery(internal.search.queries.listForBoost, {
      bookmarkIds: docIds,
      userId,
    });
  const openCountMap = new Map<string, number>(
    openCountItems.map((item) => [item.bookmarkId, item.openCount]),
  );

  // 8. Build result DTOs
  const results: SearchResultDTO[] = [];

  for (const doc of docs) {
    // Post-filter: only docs that have the correct embeddingModel
    if (doc.embeddingModel !== EMBEDDING_MODEL_KEY) continue;

    const rawScore = scoreMap.get(doc._id) ?? 0;
    const baseScore = 100 * rawScore * 0.6;
    const openCount = openCountMap.get(doc._id) ?? 0;
    const score = applyOpenFrequencyBoost(baseScore, openCount);

    results.push(
      bookmarkToSearchResult(
        {
          _id: doc._id,
          userId: doc.userId,
          url: doc.url,
          title: doc.title,
          summary: doc.summary,
          preview: doc.preview,
          type: doc.type,
          status: doc.status,
          ogImageUrl: doc.ogImageUrl,
          ogDescription: doc.ogDescription,
          faviconUrl: doc.faviconUrl,
          createdAt: doc.createdAt,
          metadata: doc.metadata,
          starred: doc.starred,
          read: doc.read,
          tags: doc.tags,
        },
        score,
        "vector",
        [],
        openCount,
      ),
    );
  }

  // 9. Sort + paginate
  const sorted = sortSearchResults(results);
  const paginated = paginateResults(sorted, cursor, limit);

  return {
    bookmarks: paginated.bookmarks,
    nextCursor: paginated.nextCursor,
    hasMore: paginated.hasMore,
    fromCache: false,
    queryTime: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// search (public authAction)
// ---------------------------------------------------------------------------

export const search = authAction({
  args: {
    query: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    types: v.optional(v.array(bookmarkType)),
    specialFilters: v.optional(
      v.array(
        v.union(v.literal("READ"), v.literal("UNREAD"), v.literal("STAR")),
      ),
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    matchingDistance: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const userId = ctx.user.id;
    const startTime = Date.now();

    // Clamp limit to 1–50, default 20
    const limit = Math.min(50, Math.max(1, args.limit ?? 20));
    const matchingDistance = args.matchingDistance ?? 0.1;
    const query = args.query ?? "";
    const tags = args.tags ?? [];
    const types = (args.types ?? []) as string[];
    const specialFilters = args.specialFilters ?? [];
    const cursor = args.cursor;

    // -----------------------------------------------------------------------
    // Route 1: no search query → default list (reactive browsing)
    // -----------------------------------------------------------------------
    if (!isSearchQuery(query)) {
      const paginationOpts = {
        numItems: limit,
        cursor: cursor ?? null,
      };

      const listResult = await ctx.runQuery(
        internal.bookmarks.queries.listDefault,
        {
          userId,
          paginationOpts,
          filter:
            types.length > 0 ||
            specialFilters.includes("STAR") ||
            specialFilters.includes("READ") ||
            specialFilters.includes("UNREAD")
              ? buildListFilter(types as any, specialFilters)
              : undefined,
        },
      );

      const bookmarks: SearchResultDTO[] = listResult.page.map((bm: any) => ({
        _id: bm._id,
        id: bm._id,
        url: bm.url,
        title: bm.title ?? null,
        summary: bm.summary ?? null,
        preview: bm.preview ?? null,
        type: bm.type ?? null,
        status: bm.status,
        ogImageUrl: bm.ogImageUrl ?? null,
        ogDescription: bm.ogDescription ?? null,
        faviconUrl: bm.faviconUrl ?? null,
        score: 0,
        matchType: "default" as const,
        matchedTags: [],
        tags: bm.tags ?? [],
        createdAt: bm.createdAt,
        metadata: bm.metadata ?? null,
        openCount: 0,
        starred: bm.starred,
        read: bm.read,
      }));

      return {
        bookmarks,
        nextCursor: listResult.continueCursor ?? undefined,
        hasMore: listResult.isDone === false,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 2: types-only (no query text, no tags) → listByType
    // -----------------------------------------------------------------------
    if (types.length > 0 && !isSearchQuery(query) && tags.length === 0) {
      const paginationOpts = {
        numItems: limit,
        cursor: cursor ?? null,
      };

      const listResult = await ctx.runQuery(
        internal.bookmarks.queries.listByType,
        {
          userId,
          types: types as any[],
          paginationOpts,
        },
      );

      const bookmarks: SearchResultDTO[] = listResult.page.map((bm: any) => ({
        _id: bm._id,
        id: bm._id,
        url: bm.url,
        title: bm.title ?? null,
        summary: bm.summary ?? null,
        preview: bm.preview ?? null,
        type: bm.type ?? null,
        status: bm.status,
        ogImageUrl: bm.ogImageUrl ?? null,
        ogDescription: bm.ogDescription ?? null,
        faviconUrl: bm.faviconUrl ?? null,
        score: 0,
        matchType: "default" as const,
        matchedTags: [],
        tags: bm.tags ?? [],
        createdAt: bm.createdAt,
        metadata: bm.metadata ?? null,
        openCount: 0,
        starred: bm.starred,
        read: bm.read,
      }));

      return {
        bookmarks,
        nextCursor: listResult.continueCursor ?? undefined,
        hasMore: listResult.isDone === false,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 3: domain query
    // -----------------------------------------------------------------------
    if (isSearchQuery(query) && isDomainQuery(query)) {
      const domain = extractDomain(query);
      const results: SearchResultDTO[] = await ctx.runQuery(
        internal.search.queries.searchByDomain,
        {
          userId,
          domain,
          types: types.length > 0 ? (types as any[]) : undefined,
          specialFilters: specialFilters.length > 0 ? specialFilters : undefined,
        },
      );

      const paginated = paginateResults(results, cursor, limit);
      return {
        bookmarks: paginated.bookmarks,
        nextCursor: paginated.nextCursor,
        hasMore: paginated.hasMore,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 4: tags-only (query is blank but we have tags)
    // -----------------------------------------------------------------------
    if (!isSearchQuery(query) && tags.length > 0) {
      const results: SearchResultDTO[] = await ctx.runQuery(
        internal.search.queries.searchByTags,
        {
          userId,
          tags,
          types: types.length > 0 ? (types as any[]) : undefined,
          specialFilters: specialFilters.length > 0 ? specialFilters : undefined,
        },
      );

      const paginated = paginateResults(results, cursor, limit);
      return {
        bookmarks: paginated.bookmarks,
        nextCursor: paginated.nextCursor,
        hasMore: paginated.hasMore,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 5: vector search (default for any real text query)
    // -----------------------------------------------------------------------
    return runVectorSearch(
      ctx,
      userId,
      query,
      matchingDistance,
      limit,
      cursor,
      tags,
      types,
      specialFilters,
    );
  },
});

// ---------------------------------------------------------------------------
// searchForChat (public authAction — used by AI chat tools)
// ---------------------------------------------------------------------------

// Internal (userId-explicit) so it can be called from the chat httpAction /
// API-key handlers via ctx.runAction (which does NOT carry a BA session).
export const searchForChat = internalAction({
  args: {
    userId: v.string(),
    query: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    types: v.optional(v.array(bookmarkType)),
    specialFilters: v.optional(
      v.array(
        v.union(v.literal("READ"), v.literal("UNREAD"), v.literal("STAR")),
      ),
    ),
    limit: v.optional(v.number()),
    matchingDistance: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SearchResponse> => {
    const userId = args.userId;
    const startTime = Date.now();

    // Chat search: limit default 6, max 20; matchingDistance default 0.8
    const limit = Math.min(20, Math.max(1, args.limit ?? 6));
    const matchingDistance = args.matchingDistance ?? 0.8;
    const query = args.query ?? "";
    const tags = args.tags ?? [];
    const types = (args.types ?? []) as string[];
    const specialFilters = args.specialFilters ?? [];

    // -----------------------------------------------------------------------
    // Route 1: no search query → default list
    // -----------------------------------------------------------------------
    if (!isSearchQuery(query)) {
      const paginationOpts = {
        numItems: limit,
        cursor: null,
      };

      const listResult = await ctx.runQuery(
        internal.bookmarks.queries.listDefault,
        {
          userId,
          paginationOpts,
          filter:
            types.length > 0 ||
            specialFilters.length > 0
              ? buildListFilter(types as any, specialFilters)
              : undefined,
        },
      );

      const bookmarks: SearchResultDTO[] = listResult.page.map((bm: any) => ({
        _id: bm._id,
        id: bm._id,
        url: bm.url,
        title: bm.title ?? null,
        summary: bm.summary ?? null,
        preview: bm.preview ?? null,
        type: bm.type ?? null,
        status: bm.status,
        ogImageUrl: bm.ogImageUrl ?? null,
        ogDescription: bm.ogDescription ?? null,
        faviconUrl: bm.faviconUrl ?? null,
        score: 0,
        matchType: "default" as const,
        matchedTags: [],
        tags: bm.tags ?? [],
        createdAt: bm.createdAt,
        metadata: bm.metadata ?? null,
        openCount: 0,
        starred: bm.starred,
        read: bm.read,
      }));

      return {
        bookmarks,
        nextCursor: listResult.continueCursor ?? undefined,
        hasMore: listResult.isDone === false,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 2: domain query
    // -----------------------------------------------------------------------
    if (isDomainQuery(query)) {
      const domain = extractDomain(query);
      const results: SearchResultDTO[] = await ctx.runQuery(
        internal.search.queries.searchByDomain,
        {
          userId,
          domain,
          types: types.length > 0 ? (types as any[]) : undefined,
          specialFilters: specialFilters.length > 0 ? specialFilters : undefined,
        },
      );

      const paginated = paginateResults(results, undefined, limit);
      return {
        bookmarks: paginated.bookmarks,
        nextCursor: undefined,
        hasMore: paginated.hasMore,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 3: tags-only
    // -----------------------------------------------------------------------
    if (!isSearchQuery(query) && tags.length > 0) {
      const results: SearchResultDTO[] = await ctx.runQuery(
        internal.search.queries.searchByTags,
        {
          userId,
          tags,
          types: types.length > 0 ? (types as any[]) : undefined,
          specialFilters: specialFilters.length > 0 ? specialFilters : undefined,
        },
      );

      const paginated = paginateResults(results, undefined, limit);
      return {
        bookmarks: paginated.bookmarks,
        nextCursor: undefined,
        hasMore: paginated.hasMore,
        fromCache: false,
        queryTime: Date.now() - startTime,
      };
    }

    // -----------------------------------------------------------------------
    // Route 4: vector search
    // -----------------------------------------------------------------------
    return runVectorSearch(
      ctx,
      userId,
      query,
      matchingDistance,
      limit,
      undefined, // no cursor for chat
      tags,
      types,
      specialFilters,
    );
  },
});

// ---------------------------------------------------------------------------
// buildListFilter — converts types / specialFilters to bookmarks.queries.list filter shape
// ---------------------------------------------------------------------------

type BookmarkTypeLiteral =
  | "VIDEO"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "YOUTUBE"
  | "TWEET"
  | "PDF"
  | "PRODUCT";

function buildListFilter(
  types: string[],
  specialFilters: ("READ" | "UNREAD" | "STAR")[],
) {
  const filter: {
    types?: BookmarkTypeLiteral[];
    starred?: boolean;
    read?: boolean;
  } = {};

  if (types.length > 0) {
    filter.types = types as BookmarkTypeLiteral[];
  }

  // Only set starred / read when the filter is unambiguous.
  // Multiple conflicting special filters would need OR logic not supported
  // here, so we pass the raw specialFilters and let the query handle it.
  if (
    specialFilters.length === 1 &&
    specialFilters.includes("STAR")
  ) {
    filter.starred = true;
  } else if (
    specialFilters.length === 1 &&
    specialFilters.includes("READ")
  ) {
    filter.read = true;
  } else if (
    specialFilters.length === 1 &&
    specialFilters.includes("UNREAD")
  ) {
    filter.read = false;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}
