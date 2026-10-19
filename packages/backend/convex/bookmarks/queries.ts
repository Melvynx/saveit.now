/**
 * bookmarks/queries.ts — Bookmark read functions.
 * Default runtime (no "use node").
 * Contract §A bookmarks/queries.ts + §B canonical refs.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalQuery, query, authQuery } from "../functions";
import { bookmarkType } from "../schema";
import { throwNotFound, throwValidationError } from "../utils/errors";
import { bookmarkDTOFields, bookmarkDTOValidator } from "./validators";
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

async function resolveBookmarkByIdOrLegacyId(
  ctx: { db: { get: Function; normalizeId: Function; query: Function } },
  idOrLegacyId: string,
): Promise<Doc<"bookmarks"> | null> {
  const normalizedId = ctx.db.normalizeId(
    "bookmarks",
    idOrLegacyId,
  ) as Id<"bookmarks"> | null;
  if (normalizedId) {
    const doc = (await ctx.db.get(normalizedId)) as Doc<"bookmarks"> | null;
    if (doc) return doc;
  }

  return (await (ctx.db as any)
    .query("bookmarks")
    .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", idOrLegacyId))
    .first()) as Doc<"bookmarks"> | null;
}

/** Card DTO with tags + open count — the same per-item shape `list` returns. */
async function buildListItemDTO(
  ctx: { db: { query: Function } },
  doc: Doc<"bookmarks">,
): Promise<BookmarkDTO> {
  const tags = await resolveTagsForBookmark(ctx, doc._id);
  const opens = await (ctx.db as any)
    .query("bookmarkOpens")
    .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
    .take(10000);
  return buildBookmarkDTO(doc as any, tags, opens.length);
}

/**
 * Bookmarks of `userId` sharing a tag with the source bookmark; falls back to
 * the user's most recent bookmarks when the source has no tags.
 */
async function findRelatedDocs(
  ctx: QueryCtx,
  userId: string,
  excludeId: Id<"bookmarks">,
  tagIds: Id<"tags">[],
  limit: number,
): Promise<Doc<"bookmarks">[]> {
  if (tagIds.length === 0) {
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit + 1);
    return rows.filter((row) => row._id !== excludeId).slice(0, limit);
  }

  const seen = new Set<string>([excludeId]);
  const related: Doc<"bookmarks">[] = [];
  for (const tagId of tagIds) {
    if (related.length >= limit) break;
    const joinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", tagId))
      .take(50);
    for (const joinRow of joinRows) {
      if (related.length >= limit) break;
      if (seen.has(joinRow.bookmarkId)) continue;
      seen.add(joinRow.bookmarkId);
      const bDoc = await ctx.db.get(joinRow.bookmarkId);
      if (!bDoc || bDoc.userId !== userId) continue;
      related.push(bDoc);
    }
  }
  return related;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const REDISCOVER_MIN_AGE_MS = 14 * DAY_MS;
const REDISCOVER_WINDOW = 300;

/** cyrb53-style string hash -> 32-bit seed. */
function hashSeed(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic partial Fisher-Yates: same seed + items -> same picks. */
export function seededPick<T>(items: T[], count: number, seed: string): T[] {
  const pool = items.slice();
  const random = mulberry32(hashSeed(seed));
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, n);
}

function clampInt(value: number | undefined, fallback: number, max: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

async function buildBookmarkDetailForDoc(
  ctx: { db: { query: Function } },
  doc: Doc<"bookmarks">,
): Promise<BookmarkDetailDTO> {
  const tags = await resolveTagsForBookmark(ctx, doc._id);
  const opens = await (ctx.db as any)
    .query("bookmarkOpens")
    .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
    .take(10000);

  return buildBookmarkDetailDTO(doc as any, tags, opens.length);
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
    order: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = ctx.user.id;
    const filter = args.filter;
    const direction = args.order === "oldest" ? "asc" : "desc";

    let paginatedResult: any;

    // Choose the most selective index for the active filter.
    if (
      filter?.types?.length === 1 &&
      filter.starred === undefined &&
      filter.read === undefined
    ) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_type_created", (q: any) =>
          q.eq("userId", userId).eq("type", filter.types![0]),
        )
        .order(direction)
        .paginate(args.paginationOpts);
    } else if (filter?.starred !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_starred", (q: any) =>
          q.eq("userId", userId).eq("starred", filter.starred),
        )
        .order(direction)
        .paginate(args.paginationOpts);
    } else if (filter?.read !== undefined) {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_read", (q: any) =>
          q.eq("userId", userId).eq("read", filter.read),
        )
        .order(direction)
        .paginate(args.paginationOpts);
    } else {
      paginatedResult = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
        .order(direction)
        .paginate(args.paginationOpts);
    }

    // Post-filter for types (no dedicated index).
    let docs = paginatedResult.page as any[];
    if (filter?.types && filter.types.length > 1) {
      docs = docs.filter((doc) => doc.type && filter.types!.includes(doc.type));
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

    return buildBookmarkDetailForDoc(ctx, doc);
  },
});

/**
 * getByIdOrLegacyId — compatibility read for imported bookmarks whose public
 * or private URLs still contain the old Postgres bookmark id.
 */
export const getByIdOrLegacyId = authQuery({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    const userId = ctx.user.id;
    const doc = await resolveBookmarkByIdOrLegacyId(ctx, args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    return buildBookmarkDetailForDoc(ctx, doc);
  },
});

/**
 * findByIdOrLegacyId — getByIdOrLegacyId for reactive UI: returns null for a
 * deleted or foreign bookmark so an open dialog or stale link can render a
 * "not found" state instead of throwing into the route error boundary.
 */
export const findByIdOrLegacyId = authQuery({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO | null> => {
    const doc = await resolveBookmarkByIdOrLegacyId(ctx, args.id);
    if (!doc || doc.userId !== ctx.user.id) return null;
    return buildBookmarkDetailForDoc(ctx, doc);
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
 * The owner must have public sharing enabled.
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
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: doc.userId as string,
    });
    if (!user || !(user as any).publicLinkEnabled) {
      return null;
    }
    const tags = await resolveTagsForBookmark(ctx, doc._id);
    const bookmark = buildPublicBookmarkDTO(doc as any);
    return { ...bookmark, tags };
  },
});

/**
 * getPublicByIdOrLegacyId — public compatibility lookup for old `/p/:id`
 * links created before the Convex migration.
 */
export const getPublicByIdOrLegacyId = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const doc = await resolveBookmarkByIdOrLegacyId(ctx, args.id);
    if (!doc) {
      return null;
    }
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: doc.userId as string,
    });
    if (!user || !(user as any).publicLinkEnabled) {
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
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });
    if (!user || !(user as any).publicLinkEnabled) return [];

    const related = await findRelatedDocs(
      ctx,
      userId,
      args.id,
      args.tagIds as Id<"tags">[],
      limit,
    );
    return related.map((row) => buildPublicBookmarkDTO(row as any));
  },
});

const recentlyOpenedItemValidator = v.object({
  ...bookmarkDTOFields,
  lastOpenedAt: v.number(),
});

/**
 * related — owner variant of getRelated for private bookmarks. Same tag-overlap
 * logic, tags read server-side; returns list-shaped card DTOs.
 */
export const related = authQuery({
  args: {
    bookmarkId: v.id("bookmarks"),
    limit: v.optional(v.number()),
  },
  returns: v.array(bookmarkDTOValidator),
  handler: async (ctx, args): Promise<BookmarkDTO[]> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.bookmarkId);
    if (!doc || doc.userId !== userId) return [];

    const limit = clampInt(args.limit, 6, 20);
    const joinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", doc._id))
      .take(200);
    const docs = await findRelatedDocs(
      ctx,
      userId,
      doc._id,
      joinRows.map((row) => row.tagId),
      limit,
    );

    const items: BookmarkDTO[] = [];
    for (const related of docs) {
      items.push(await buildListItemDTO(ctx, related));
    }
    return items;
  },
});

/**
 * rediscover — a few READY bookmarks older than 14 days, picked
 * deterministically per UTC day + user from a bounded index window.
 * Pass `day` (YYYY-MM-DD, UTC) from the client so the result is a pure
 * function of args; defaults to today.
 */
export const rediscover = authQuery({
  args: {
    count: v.optional(v.number()),
    day: v.optional(v.string()),
  },
  returns: v.array(bookmarkDTOValidator),
  handler: async (ctx, args): Promise<BookmarkDTO[]> => {
    const userId = ctx.user.id;
    const count = clampInt(args.count, 4, 8);
    const day = args.day ?? new Date().toISOString().slice(0, 10);
    const dayStart = /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? Date.parse(`${day}T00:00:00Z`)
      : NaN;
    if (Number.isNaN(dayStart)) {
      throwValidationError("day must be YYYY-MM-DD");
    }
    const cutoff = dayStart - REDISCOVER_MIN_AGE_MS;

    const window = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", userId).lt("createdAt", cutoff),
      )
      .order("desc")
      .take(REDISCOVER_WINDOW);
    const eligible = window.filter(
      (doc) => doc.status === "READY" && doc.isExample !== true,
    );

    const picks = seededPick(eligible, count, `${day}:${userId}`);
    const items: BookmarkDTO[] = [];
    for (const doc of picks) {
      items.push(await buildListItemDTO(ctx, doc));
    }
    return items;
  },
});

const SIDEBAR_COUNT_CAP = 100;

/**
 * sidebarCounts — unread (read === false, same as list filter { read: false })
 * and starred counts, capped at 100. `capped` is true when either exceeds it.
 */
export const sidebarCounts = authQuery({
  args: {},
  returns: v.object({
    unread: v.number(),
    starred: v.number(),
    capped: v.boolean(),
  }),
  handler: async (
    ctx,
  ): Promise<{ unread: number; starred: number; capped: boolean }> => {
    const userId = ctx.user.id;
    const unreadRows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("read", false),
      )
      .take(SIDEBAR_COUNT_CAP + 1);
    const starredRows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_starred", (q) =>
        q.eq("userId", userId).eq("starred", true),
      )
      .take(SIDEBAR_COUNT_CAP + 1);

    return {
      unread: Math.min(unreadRows.length, SIDEBAR_COUNT_CAP),
      starred: Math.min(starredRows.length, SIDEBAR_COUNT_CAP),
      capped:
        unreadRows.length > SIDEBAR_COUNT_CAP ||
        starredRows.length > SIDEBAR_COUNT_CAP,
    };
  },
});

/**
 * recentlyOpened — distinct bookmarks from the user's latest opens
 * (bookmarkOpens.by_user_opened, desc), newest first. Missing bookmarks skipped.
 */
export const recentlyOpened = authQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(recentlyOpenedItemValidator),
  handler: async (
    ctx,
    args,
  ): Promise<Array<BookmarkDTO & { lastOpenedAt: number }>> => {
    const userId = ctx.user.id;
    const limit = clampInt(args.limit, 6, 20);

    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit * 10);

    const seen = new Set<string>();
    const items: Array<BookmarkDTO & { lastOpenedAt: number }> = [];
    for (const open of opens) {
      if (items.length >= limit) break;
      if (seen.has(open.bookmarkId)) continue;
      seen.add(open.bookmarkId);
      const doc = await ctx.db.get(open.bookmarkId);
      if (!doc || doc.userId !== userId) continue;
      items.push({
        ...(await buildListItemDTO(ctx, doc)),
        lastOpenedAt: open.openedAt,
      });
    }
    return items;
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
        .withIndex("by_user_created", (q: any) => q.eq("userId", args.userId))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    let docs = paginatedResult.page as any[];
    if (filter?.types && filter.types.length > 0) {
      docs = docs.filter((doc) => doc.type && filter.types!.includes(doc.type));
    }

    const bookmarkDTOs: BookmarkDTO[] = [];
    for (const doc of docs) {
      const tags = await resolveTagsForBookmark(ctx, doc._id);
      const opens = await ctx.db
        .query("bookmarkOpens")
        .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
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
        .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
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
    const openedBookmarkIds = new Set(
      openedRows.map((r: any) => r.bookmarkId as string),
    );

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
      .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
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
