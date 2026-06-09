/**
 * bookmarks/queries.ts — Bookmark read functions.
 * Default runtime (no "use node").
 * Contract §A bookmarks/queries.ts + §B canonical refs.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalQuery,
  query,
  authQuery,
} from "../functions";
import { bookmarkType } from "../schema";
import { throwNotFound } from "../utils/errors";
import {
  buildBookmarkDTO,
  buildBookmarkDetailDTO,
  buildPublicBookmarkDTO,
  type BookmarkDetailDTO,
  type BookmarkDTO,
  type TagInBookmark,
} from "./dto";

// ---------------------------------------------------------------------------
// Helper: resolve tags for a single bookmark
// ---------------------------------------------------------------------------

async function resolveTagsForBookmark(
  ctx: { db: { query: Function } },
  bookmarkId: Id<"bookmarks">,
): Promise<TagInBookmark[]> {
  const joinRows = await (ctx.db as any)
    .query("bookmarkTags")
    .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", bookmarkId))
    .take(200);

  const tags: TagInBookmark[] = [];
  for (const row of joinRows) {
    const tag = await (ctx.db as any).get(row.tagId);
    if (tag) {
      tags.push({
        tag: {
          id: tag._id as string,
          name: tag.name as string,
          type: tag.type as string,
        },
      });
    }
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Public authQuery functions
// ---------------------------------------------------------------------------

/**
 * list — paginated bookmark list for the authenticated user.
 * Uses by_user_created index (desc). Optionally filters by type/starred/read/tags.
 */
export const list = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(
      v.object({
        types: v.optional(v.array(bookmarkType)),
        starred: v.optional(v.boolean()),
        read: v.optional(v.boolean()),
        tagIds: v.optional(v.array(v.id("tags"))),
      }),
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = ctx.user.id;
    const filter = args.filter;

    let paginatedResult: any;

    // Choose the most selective index for the active filter.
    if (filter?.starred !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_starred", (q: any) =>
          q.eq("userId", userId).eq("starred", filter.starred),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (filter?.read !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_read", (q: any) =>
          q.eq("userId", userId).eq("read", filter.read),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Post-filter for types (no dedicated index).
    let docs = paginatedResult.page as any[];
    if (filter?.types && filter.types.length > 0) {
      docs = docs.filter(
        (doc) => doc.type && filter.types!.includes(doc.type),
      );
    }

    // Post-filter for tagIds.
    if (filter?.tagIds && filter.tagIds.length > 0) {
      const tagFilterIds = new Set(filter.tagIds);
      const filtered: any[] = [];
      for (const doc of docs) {
        const joinRows = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", doc._id))
          .take(200);
        const hasTag = joinRows.some((r: any) => tagFilterIds.has(r.tagId));
        if (hasTag) filtered.push(doc);
      }
      docs = filtered;
    }

    // Resolve tags + open counts for each bookmark.
    const bookmarkDTOs: BookmarkDTO[] = [];
    for (const doc of docs) {
      const tags = await resolveTagsForBookmark(ctx, doc._id);
      const opens = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
        .take(10000);
      bookmarkDTOs.push(buildBookmarkDTO(doc, tags, opens.length));
    }

    return {
      ...paginatedResult,
      page: bookmarkDTOs,
    };
  },
});

/**
 * get — single bookmark detail for the authenticated user.
 */
export const get = authQuery({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    const tags = await resolveTagsForBookmark(ctx, doc._id);
    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
      .take(10000);

    return buildBookmarkDetailDTO(doc as any, tags, opens.length);
  },
});

/**
 * count — reads denormalized bookmark count from userCounters.
 */
export const count = authQuery({
  args: {},
  handler: async (ctx, _args): Promise<number> => {
    const userId = ctx.user.id;
    const counters = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    return counters?.bookmarkCount ?? 0;
  },
});

/**
 * getByPublicSlug — unauthenticated public bookmark list.
 * Contract §A bookmarks/queries.ts: plain `query` (NOT authQuery).
 * Forces starred:false, read:false. Enforces publicLinkEnabled gate.
 */
export const getByPublicSlug = query({
  args: {
    slug: v.string(),
    type: v.optional(bookmarkType),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<any> => {
    // Resolve user via betterAuth public-slug index.
    const user = await ctx.runQuery(
      components.betterAuth.data.getUserByPublicSlug,
      { slug: args.slug },
    );

    if (!user || !(user as any).publicLinkEnabled) {
      throwNotFound("Public link not found");
    }

    const userId = (user as any)._id as string;

    const paginatedResult = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    let docs = paginatedResult.page as any[];

    // Optional type filter.
    if (args.type) {
      docs = docs.filter((doc) => doc.type === args.type);
    }

    const bookmarks = docs.map((doc) => buildPublicBookmarkDTO(doc as any));

    return {
      user: {
        name: (user as any).name as string,
        image: ((user as any).image as string | null) ?? null,
      },
      bookmarks,
      hasMore: !paginatedResult.isDone,
      nextCursor: paginatedResult.isDone
        ? undefined
        : paginatedResult.continueCursor,
    };
  },
});

/**
 * getPublic — unauthenticated single public bookmark by ID.
 * Returns a PublicBookmarkDTO (whitelist only — no userId, note, transcript).
 * Any bookmark can be fetched by ID (no ownership gate — it is intentionally public).
 */
export const getPublic = query({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<any> => {
    const doc = await ctx.db.get(args.id);
    if (!doc) {
      return null;
    }
    const tags = await resolveTagsForBookmark(ctx, doc._id);
    const bookmark = buildPublicBookmarkDTO(doc as any);
    return { ...bookmark, tags };
  },
});

/**
 * getRelated — unauthenticated query for related public bookmarks.
 * Returns up to `take` bookmarks from the same user that share at least one tag.
 */
export const getRelated = query({
  args: {
    id: v.id("bookmarks"),
    tagIds: v.array(v.string()),
    take: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return [];

    const limit = args.take ?? 6;
    const userId = doc.userId as string;

    if (args.tagIds.length === 0) {
      // Fallback: just return recent bookmarks from the same user (excluding this one)
      const rows = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(limit + 1);
      return rows
        .filter((row) => row._id !== args.id)
        .slice(0, limit)
        .map((row) => buildPublicBookmarkDTO(row as any));
    }

    // Collect bookmarks that share a tagId with this bookmark.
    const seen = new Set<string>();
    seen.add(args.id as string);
    const related: any[] = [];

    for (const tagId of args.tagIds) {
      if (related.length >= limit) break;
      let typedTagId: Id<"tags">;
      try {
        typedTagId = tagId as Id<"tags">;
      } catch {
        continue;
      }
      const joinRows = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_tag", (q: any) => q.eq("tagId", typedTagId))
        .take(50);
      for (const joinRow of joinRows) {
        if (related.length >= limit) break;
        const bid = joinRow.bookmarkId as string;
        if (seen.has(bid)) continue;
        seen.add(bid);
        const bDoc = await ctx.db.get(joinRow.bookmarkId);
        if (!bDoc || bDoc.userId !== userId) continue;
        related.push(buildPublicBookmarkDTO(bDoc as any));
      }
    }
    return related;
  },
});

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

export const getById = internalQuery({
  args: {
    id: v.id("bookmarks"),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO | null> => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) return null;

    const tags = await resolveTagsForBookmark(ctx, doc._id);
    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
      .take(10000);

    return buildBookmarkDetailDTO(doc as any, tags, opens.length);
  },
});

export const listByIds = internalQuery({
  args: {
    ids: v.array(v.id("bookmarks")),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO[]> => {
    const results: BookmarkDetailDTO[] = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.userId !== args.userId) continue;

      const tags = await resolveTagsForBookmark(ctx, doc._id);
      const opens = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
        .take(10000);

      results.push(buildBookmarkDetailDTO(doc as any, tags, opens.length));
    }
    return results;
  },
});

export const listDefault = internalQuery({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(
      v.object({
        types: v.optional(v.array(bookmarkType)),
        starred: v.optional(v.boolean()),
        read: v.optional(v.boolean()),
        tagIds: v.optional(v.array(v.id("tags"))),
      }),
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    const filter = args.filter;

    let paginatedResult: any;

    if (filter?.starred !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_starred", (q: any) =>
          q.eq("userId", args.userId).eq("starred", filter.starred),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (filter?.read !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_read", (q: any) =>
          q.eq("userId", args.userId).eq("read", filter.read),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_created", (q: any) =>
          q.eq("userId", args.userId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    let docs = paginatedResult.page as any[];
    if (filter?.types && filter.types.length > 0) {
      docs = docs.filter(
        (doc) => doc.type && filter.types!.includes(doc.type),
      );
    }

    const bookmarkDTOs: BookmarkDTO[] = [];
    for (const doc of docs) {
      const tags = await resolveTagsForBookmark(ctx, doc._id);
      const opens = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", doc._id),
        )
        .take(10000);
      bookmarkDTOs.push(buildBookmarkDTO(doc as any, tags, opens.length));
    }

    return { ...paginatedResult, page: bookmarkDTOs };
  },
});

export const listByType = internalQuery({
  args: {
    userId: v.string(),
    types: v.array(bookmarkType),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<any> => {
    const paginatedResult = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const docs = (paginatedResult.page as any[]).filter(
      (doc) => doc.type && args.types.includes(doc.type),
    );

    const bookmarkDTOs: BookmarkDTO[] = [];
    for (const doc of docs) {
      const tags = await resolveTagsForBookmark(ctx, doc._id);
      const opens = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", doc._id),
        )
        .take(10000);
      bookmarkDTOs.push(buildBookmarkDTO(doc as any, tags, opens.length));
    }

    return { ...paginatedResult, page: bookmarkDTOs };
  },
});

/**
 * getRandom — returns a random unread (not yet opened) READY bookmark.
 * Spec 02 §6.10, Contract §A bookmarks/queries.ts.
 */
export const getRandom = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ bookmark: BookmarkDetailDTO; remaining: number } | null> => {
    // Collect opened bookmark IDs for this user.
    const openedRows = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q: any) => q.eq("userId", args.userId))
      .take(5000);
    const openedBookmarkIds = new Set(openedRows.map((r: any) => r.bookmarkId as string));

    // Load READY bookmarks (bounded).
    const readyBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", args.userId).eq("status", "READY"),
      )
      .take(5000);

    // Exclude already opened ones.
    const eligible = readyBookmarks.filter(
      (doc) => !openedBookmarkIds.has(doc._id as string),
    );

    if (eligible.length === 0) return null;

    // Pick a random one.
    const idx = Math.floor(Math.random() * eligible.length);
    const doc = eligible[idx]!;

    const tags = await resolveTagsForBookmark(ctx, doc._id);
    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_bookmark_user", (q: any) =>
        q.eq("bookmarkId", doc._id),
      )
      .take(10000);

    return {
      bookmark: buildBookmarkDetailDTO(doc as any, tags, opens.length),
      remaining: eligible.length,
    };
  },
});

/**
 * listErrorBookmarks — internal; returns this user's ERROR-status bookmarks
 * (used by the Stripe upgrade flow to retry bookmarks that failed on a limit).
 */
export const listErrorBookmarks = internalQuery({
  args: { userId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ _id: string; processingError: string | null }>> => {
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", args.userId).eq("status", "ERROR"),
      )
      .take(1000);
    return rows.map((doc) => ({
      _id: doc._id as string,
      processingError: doc.processingError ?? null,
    }));
  },
});
