/**
 * Internal helper functions used by api/v1.ts httpActions.
 *
 * These bridge the gap between httpActions (which have no auth context) and
 * the app's data layer. All functions accept `userId` as an explicit arg.
 *
 * Default Convex V8 runtime (no "use node").
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal, components } from "../_generated/api";
import { throwNotFound } from "../utils/errors";

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
  handler: async (
    ctx,
    args,
  ): Promise<{
    bookmarks: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  }> => {
    const limit = Math.min(args.limit ?? 20, 100);
    const paginationOpts = { numItems: limit, cursor: args.cursor ?? null };

    if (
      args.query ||
      (args.tags && args.tags.length > 0) ||
      (args.specialFilters && args.specialFilters.length > 0)
    ) {
      const result = await ctx.runAction(
        internal.search.actions.searchForChat,
        {
          userId: args.userId,
          query: args.query,
          tags: args.tags,
          types: args.types as BookmarkTypeLiteral[] | undefined,
          specialFilters: args.specialFilters as
            | SpecialFilterLiteral[]
            | undefined,
          limit,
          cursor: args.cursor,
          matchingDistance: args.matchingDistance,
        },
      );
      return {
        bookmarks: (result.bookmarks ?? []) as Array<Record<string, unknown>>,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor ?? null,
      };
    }

    // Default list
    const result: {
      page: Array<Record<string, unknown>>;
      isDone: boolean;
      continueCursor?: string;
    } = await ctx.runQuery(internal.bookmarks.queries.listDefault, {
      userId: args.userId,
      paginationOpts,
      filter:
        args.types && args.types.length > 0
          ? { types: args.types as BookmarkTypeLiteral[] }
          : undefined,
    });

    return {
      bookmarks:
        (result as { page: Array<Record<string, unknown>> }).page ?? [],
      hasMore: !(result as { isDone: boolean }).isDone,
      nextCursor:
        (result as { continueCursor?: string }).continueCursor ?? null,
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
    const bookmark: Record<string, unknown> | null = await ctx.runMutation(
      internal.bookmarks.mutations.createInternal,
      args,
    );
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
    await ctx.runMutation(internal.api.helpers.deleteBookmarkMutation, args);
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
    await ctx.runMutation(internal.api.helpers.recordOpenMutation, args);
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

    const page = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    // For each tag, count bookmarks
    const tagsWithCount = await Promise.all(
      page.page.map(async (tag) => {
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
      hasMore: !page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
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
  handler: async (
    ctx,
    args,
  ): Promise<{
    user: { name: string; image: string | null };
    bookmarks: Array<Record<string, unknown>>;
    hasMore: boolean;
    nextCursor: string | null;
  } | null> => {
    // Look up user by public slug via betterAuth component
    const user: {
      _id: string;
      name: string;
      image?: string | null;
      publicLinkEnabled?: boolean;
    } | null = await ctx.runQuery(
      components.betterAuth.data.getUserByPublicSlug,
      { slug: args.slug },
    );

    if (!user || !user.publicLinkEnabled) {
      return null;
    }

    // Run search for this user's bookmarks
    const result: {
      bookmarks: Array<Record<string, unknown>>;
      hasMore: boolean;
      nextCursor: string | null;
    } = await ctx.runAction(internal.api.helpers.searchBookmarksForUser, {
      userId: user._id as string,
      query: args.query,
      tags: args.tags,
      types: args.types,
      limit: args.limit,
      cursor: args.cursor,
      matchingDistance: 0.3,
      specialFilters: [],
    });

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
