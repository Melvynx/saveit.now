/**
 * Internal helper functions used by api/v1.ts httpActions.
 *
 * These bridge the gap between httpActions (which have no auth context) and
 * the app's data layer. All functions accept `userId` as an explicit arg.
 *
 * Default Convex V8 runtime (no "use node").
 */

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { throwNotFound } from "../utils/errors";
import { cleanUrl } from "../utils/url";

type BookmarkTypeLiteral =
  | "VIDEO"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "YOUTUBE"
  | "TWEET"
  | "PDF"
  | "PRODUCT";
type SpecialFilterLiteral = "READ" | "UNREAD" | "STAR";

// ---------------------------------------------------------------------------
// search for API key callers
// ---------------------------------------------------------------------------

/**
 * searchBookmarksForUser — internalAction
 *
 * Runs a bookmark search on behalf of a user (identified by userId from an
 * API key). This is the bridge between the v1 httpAction and the search
 * infrastructure. The search/actions.ts module's searchForChat is authAction
 * (requires session), so we proxy it here with explicit userId.
 *
 * Spec 09 §3.1
 */
export const searchBookmarksForUser = internalAction({
  args: {
    userId: v.string(),
    query: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    types: v.optional(v.array(v.string())),
    specialFilters: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    matchingDistance: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    bookmarks: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  }> => {
    const limit = Math.min(args.limit ?? 20, 100);
    const paginationOpts = { numItems: limit, cursor: args.cursor ?? null };

    if (args.tags && args.tags.length > 0) {
      const result: Array<Record<string, unknown>> = await ctx.runQuery(
        internal.search.queries.searchByTags,
        {
          userId: args.userId,
          tags: args.tags,
          types: args.types as BookmarkTypeLiteral[] | undefined,
          specialFilters: args.specialFilters as
            | SpecialFilterLiteral[]
            | undefined,
        },
      );
      const all: Array<Record<string, unknown>> = result ?? [];
      const start = args.cursor ? parseInt(args.cursor, 10) || 0 : 0;
      const page: Array<Record<string, unknown>> = all.slice(start, start + limit);
      const hasMore = all.length > start + limit;
      return {
        bookmarks: page,
        hasMore,
        nextCursor: hasMore ? String(start + limit) : null,
      };
    }

    // Default list
    const result: { page: Array<Record<string, unknown>>; isDone: boolean; continueCursor?: string } = await ctx.runQuery(
      internal.bookmarks.queries.listDefault,
      {
        userId: args.userId,
        paginationOpts,
        filter:
          args.types && args.types.length > 0
            ? { types: args.types as BookmarkTypeLiteral[] }
            : undefined,
      },
    );

    return {
      bookmarks: (result as { page: Array<Record<string, unknown>> }).page ?? [],
      hasMore: !(result as { isDone: boolean }).isDone,
      nextCursor: (result as { continueCursor?: string }).continueCursor ?? null,
    };
  },
});

// ---------------------------------------------------------------------------
// bookmark create (for API key callers)
// ---------------------------------------------------------------------------

/**
 * createBookmarkForUser — internalAction
 *
 * Creates a bookmark on behalf of a user identified by userId (from a validated
 * API key). Delegates to internal.bookmarks.mutations.createInternal which
 * accepts userId as an arg (to be built by the bookmarks agent).
 *
 * Note: bookmarks.mutations.create is an authMutation (userId from session).
 * For API-key callers we need the internal variant.
 */
export const createBookmarkForUser = internalAction({
  args: {
    userId: v.string(),
    url: v.string(),
    transcript: v.optional(v.string()),
    metadata: v.optional(v.any()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown> | null> => {
    // Delegate to bookmarks internal create mutation
    const id: Record<string, unknown> | null = await ctx.runMutation(
      internal.api.helpers.createBookmarkMutation,
      args,
    );
    return id;
  },
});

export const createBookmarkMutation = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
    transcript: v.optional(v.string()),
    metadata: v.optional(v.any()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cleanedUrl = cleanUrl(args.url);

    // Dedupe check
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_url", (q) =>
        q.eq("userId", args.userId).eq("url", cleanedUrl),
      )
      .first();

    if (existing) {
      throw new Error(`Bookmark already exists for this URL`);
    }

    // Check user counters for limit
    const counters = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Insert bookmark
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: args.userId,
      url: cleanedUrl,
      status: "PENDING",
      starred: false,
      read: false,
      createdAt: now,
      updatedAt: now,
      ...(args.note ? { note: args.note } : {}),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    });

    // Update counter
    if (counters) {
      await ctx.db.patch(counters._id, {
        bookmarkCount: counters.bookmarkCount + 1,
      });
    } else {
      const monthKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
      await ctx.db.insert("userCounters", {
        userId: args.userId,
        bookmarkCount: 1,
        monthKey,
        monthlyRuns: 0,
        monthlyChatQueries: 0,
      });
    }

    // Schedule processing
    await ctx.scheduler.runAfter(0, internal.processing.pipeline.run, {
      bookmarkId,
      userId: args.userId,
    });

    const bookmark = await ctx.db.get(bookmarkId);
    return bookmark;
  },
});

// ---------------------------------------------------------------------------
// bookmark delete (for API key callers)
// ---------------------------------------------------------------------------

export const deleteBookmarkForUser = internalAction({
  args: {
    userId: v.string(),
    bookmarkId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(
      internal.api.helpers.deleteBookmarkMutation,
      args,
    );
    return { id: args.bookmarkId };
  },
});

export const deleteBookmarkMutation = internalMutation({
  args: {
    userId: v.string(),
    bookmarkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to normalize the ID
    const id = ctx.db.normalizeId("bookmarks", args.bookmarkId);
    if (!id) throwNotFound("Bookmark not found");

    const bookmark = await ctx.db.get(id!);
    if (!bookmark || bookmark.userId !== args.userId) {
      throwNotFound("Bookmark not found");
    }

    // Delete bookmarkTags
    const tags = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", id!))
      .take(500);
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // Delete bookmarkOpens
    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_bookmark_user", (q) => q.eq("bookmarkId", id!))
      .take(500);
    for (const open of opens) {
      await ctx.db.delete(open._id);
    }

    // Decrement counter
    const counters = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (counters && counters.bookmarkCount > 0) {
      await ctx.db.patch(counters._id, {
        bookmarkCount: counters.bookmarkCount - 1,
      });
    }

    await ctx.db.delete(id!);

    return { id: args.bookmarkId };
  },
});

// ---------------------------------------------------------------------------
// record bookmark open (for API key callers)
// ---------------------------------------------------------------------------

export const recordBookmarkOpenForUser = internalAction({
  args: {
    userId: v.string(),
    bookmarkId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(
      internal.api.helpers.recordOpenMutation,
      args,
    );
    return null;
  },
});

export const recordOpenMutation = internalMutation({
  args: {
    userId: v.string(),
    bookmarkId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("bookmarks", args.bookmarkId);
    if (!id) return null;

    await ctx.db.insert("bookmarkOpens", {
      bookmarkId: id,
      userId: args.userId,
      openedAt: Date.now(),
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// count opened bookmarks (for random endpoint 404 response)
// ---------------------------------------------------------------------------

export const countOpenedBookmarks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Estimate by counting bookmark opens (distinct bookmarkId) — take(1000)
    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q) => q.eq("userId", args.userId))
      .take(1000);

    const uniqueIds = new Set(opens.map((o) => o.bookmarkId.toString()));
    return uniqueIds.size;
  },
});

// ---------------------------------------------------------------------------
// list tags for API key callers  (Spec 09 §3.5)
// ---------------------------------------------------------------------------

export const listTagsForUser = internalQuery({
  args: {
    userId: v.string(),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit, 100));

    // Cursor-based pagination: cursor is the _id of the last tag
    let query = ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    // Take limit + 1 to determine hasMore
    const rows = await query.take(limit + 1);

    // Apply cursor offset if provided
    let startIndex = 0;
    if (args.cursor) {
      const idx = rows.findIndex((r) => r._id.toString() === args.cursor);
      if (idx >= 0) startIndex = idx + 1;
    }

    const slice = rows.slice(startIndex, startIndex + limit + 1);
    const hasMore = slice.length > limit;
    const items = slice.slice(0, limit);

    // For each tag, count bookmarks
    const tagsWithCount = await Promise.all(
      items.map(async (tag) => {
        const bts = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
          .take(10000);
        return {
          id: tag._id as string,
          name: tag.name,
          type: tag.type,
          bookmarkCount: bts.length,
        };
      }),
    );

    return {
      tags: tagsWithCount,
      hasMore,
      nextCursor: hasMore ? (items[items.length - 1]?._id as string) : null,
    };
  },
});

// ---------------------------------------------------------------------------
// public slug search (for GET /api/v1/public/:slug/bookmarks)
// Spec 09 §3.6
// ---------------------------------------------------------------------------

/**
 * publicSlugSearchAction — internalAction
 *
 * Looks up the user by publicLinkSlug, verifies publicLinkEnabled, then
 * runs the search action with the user's ID (matchingDistance: 0.3).
 * Returns null if the slug is not found or publicLinkEnabled !== true.
 */
export const publicSlugSearchAction = internalAction({
  args: {
    slug: v.string(),
    query: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    types: v.optional(v.array(v.string())),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    user: { name: string; image: string | null };
    bookmarks: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  } | null> => {
    // Look up user by public slug via betterAuth component
    const user: { _id: string; name: string; image?: string | null; publicLinkEnabled?: boolean } | null = await ctx.runQuery(
      components.betterAuth.data.getUserByPublicSlug,
      { slug: args.slug },
    );

    if (!user || !user.publicLinkEnabled) {
      return null;
    }

    // Run search for this user's bookmarks
    const result: { bookmarks: Array<Record<string, unknown>>; hasMore: boolean; nextCursor: string | null } = await ctx.runAction(
      internal.api.helpers.searchBookmarksForUser,
      {
        userId: user._id as string,
        query: args.query,
        tags: args.tags,
        types: args.types,
        limit: args.limit,
        cursor: args.cursor,
        matchingDistance: 0.3,
        specialFilters: [],
      },
    );

    return {
      user: {
        name: user.name,
        image: user.image ?? null,
      },
      bookmarks: result.bookmarks ?? [],
      hasMore: result.hasMore ?? false,
      nextCursor: result.nextCursor ?? null,
    };
  },
});
