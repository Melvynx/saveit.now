/**
 * tags/queries.ts — Tag read functions.
 * Default runtime (no "use node").
 * Contract §A tags/queries.ts + §B canonical refs.
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { authQuery, internalQuery } from "../functions";

import { throwNotFound } from "../utils/errors";
import type { TagDTO, TagManagementDTO } from "../bookmarks/dto";
import type { Id } from "../_generated/dataModel";

// ---------------------------------------------------------------------------
// list — paginated tag list, optional client-side text filter
// ---------------------------------------------------------------------------

export const list = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    query: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = ctx.user.id;

    const paginatedResult = await ctx.db
      .query("tags")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .paginate(args.paginationOpts);

    let tags = paginatedResult.page as any[];

    // Client-side text filter (Convex has no native case-insensitive contains).
    if (args.query && args.query.trim()) {
      const q = args.query.trim().toLowerCase();
      tags = tags.filter((tag) =>
        (tag.name as string).toLowerCase().includes(q),
      );
    }

    const tagDTOs: TagDTO[] = tags.map((tag) => ({
      _id: tag._id as Id<"tags">,
      id: tag._id as string,
      name: tag.name as string,
      type: tag.type as "USER" | "IA",
    }));

    return { ...paginatedResult, page: tagDTOs };
  },
});

// ---------------------------------------------------------------------------
// getByBookmark — tags for a specific bookmark (ownership-checked)
// ---------------------------------------------------------------------------

export const getByBookmark = authQuery({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<TagDTO[]> => {
    const userId = ctx.user.id;

    // Assert bookmark ownership.
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    const joinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.bookmarkId))
      .take(200);

    const tags: TagDTO[] = [];
    for (const row of joinRows) {
      const tag = await ctx.db.get(row.tagId);
      if (tag) {
        tags.push({
          _id: tag._id as Id<"tags">,
          id: tag._id as string,
          name: tag.name as string,
          type: tag.type as "USER" | "IA",
        });
      }
    }

    return tags;
  },
});

// ---------------------------------------------------------------------------
// listManagement — tags enriched with bookmark counts (sorted by count desc)
// ---------------------------------------------------------------------------

export const listManagement = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    query: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = ctx.user.id;

    const paginatedResult = await ctx.db
      .query("tags")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .paginate(args.paginationOpts);

    let tags = paginatedResult.page as any[];

    // Client-side text filter.
    if (args.query && args.query.trim()) {
      const q = args.query.trim().toLowerCase();
      tags = tags.filter((tag) =>
        (tag.name as string).toLowerCase().includes(q),
      );
    }

    // Enrich with bookmark counts via by_tag index.
    const enriched: TagManagementDTO[] = await Promise.all(
      tags.map(async (tag) => {
        const bookmarkTagRows = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_tag", (q: any) => q.eq("tagId", tag._id))
          .take(10000);
        return {
          _id: tag._id as Id<"tags">,
          id: tag._id as string,
          name: tag.name as string,
          type: tag.type as "USER" | "IA",
          _count: { bookmarks: bookmarkTagRows.length },
        };
      }),
    );

    // Sort by bookmark count descending (in-memory, acceptable for < 1000 tags).
    enriched.sort((a, b) => b._count.bookmarks - a._count.bookmarks);

    return { ...paginatedResult, page: enriched };
  },
});

// ---------------------------------------------------------------------------
// list_internal_for_processing — used by processing/handlers.ts to fetch
// existing tag names for the generateAndCreateTags prompt enhancement
// ---------------------------------------------------------------------------

export const list_internal_for_processing = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{ name: string }>> => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .take(500);

    return tags.map((t) => ({ name: t.name as string }));
  },
});

// ---------------------------------------------------------------------------
// _getAllTagsWithCounts — internal query used by tags/actions.ts suggestCleanup
// ---------------------------------------------------------------------------

export const _getAllTagsWithCounts = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ id: string; name: string; bookmarkCount: number }>> => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .take(1000);

    const result: Array<{ id: string; name: string; bookmarkCount: number }> =
      [];

    for (const tag of tags) {
      const joinRows = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_tag", (q: any) => q.eq("tagId", tag._id))
        .take(10000);
      result.push({
        id: tag._id as string,
        name: tag.name as string,
        bookmarkCount: joinRows.length,
      });
    }

    // Sort by bookmark count desc.
    result.sort((a, b) => b.bookmarkCount - a.bookmarkCount);

    return result;
  },
});
