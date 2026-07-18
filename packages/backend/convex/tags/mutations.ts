/**
 * tags/mutations.ts — Tag write functions.
 * Default runtime (no "use node").
 * Contract §A tags/mutations.ts + §B canonical refs.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { authMutation, internalMutation } from "../functions";
import { throwNotFound, throwValidationError } from "../utils/errors";
import type { TagDTO } from "../bookmarks/dto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveTagDTO(tag: any): Promise<TagDTO> {
  return {
    _id: tag._id as Id<"tags">,
    id: tag._id as string,
    name: tag.name as string,
    type: tag.type as "USER" | "IA",
  };
}

/**
 * Upsert a tag by (userId, name). Returns the tag document.
 * Creates with the given type ("USER" by default) if not found.
 * Exported for reuse (e.g. bookmarks/seed.ts).
 */
export async function upsertTagByName(
  ctx: any,
  userId: string,
  name: string,
  type: "USER" | "IA" = "USER",
): Promise<any> {
  const existing = await ctx.db
    .query("tags")
    .withIndex("by_user_name", (q: any) =>
      q.eq("userId", userId).eq("name", name),
    )
    .first();

  if (existing) return existing;

  const tagId = await ctx.db.insert("tags", {
    userId,
    name,
    type,
  });
  return ctx.db.get(tagId);
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export const create = authMutation({
  args: {
    name: v.string(),
    type: v.optional(v.union(v.literal("USER"), v.literal("IA"))),
  },
  handler: async (ctx, args): Promise<TagDTO> => {
    const userId = ctx.user.id;
    const name = args.name.trim();

    if (!name) {
      throwValidationError("Tag name cannot be empty");
    }

    // Check uniqueness.
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_name", (q: any) =>
        q.eq("userId", userId).eq("name", name),
      )
      .first();

    if (existing) {
      throwValidationError("Tag already exists");
    }

    const tagId = await ctx.db.insert("tags", {
      userId,
      name,
      type: args.type ?? "USER",
    });

    const tag = await ctx.db.get(tagId);
    return resolveTagDTO(tag);
  },
});

// ---------------------------------------------------------------------------
// setBookmarkTagsByName — diff-based update (takes tag names, upserts as needed)
// ---------------------------------------------------------------------------

export const setBookmarkTagsByName = authMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tagNames: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<TagDTO[]> => {
    const userId = ctx.user.id;

    // Assert bookmark ownership.
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    // 1. Trim and deduplicate names (filter empty strings).
    const desiredNames = Array.from(
      new Set(args.tagNames.map((n) => n.trim()).filter((n) => n.length > 0)),
    );

    // 2. Fetch current bookmarkTags for this bookmark.
    const currentJoinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.bookmarkId))
      .take(200);

    // Resolve current tag names.
    const currentTagMap = new Map<string, any>(); // name → join row
    const currentTagById = new Map<string, any>(); // tagId → tag doc
    for (const row of currentJoinRows) {
      const tag = await ctx.db.get(row.tagId);
      if (tag) {
        currentTagMap.set(tag.name as string, row);
        currentTagById.set(row.tagId as string, tag);
      }
    }

    const currentNames = Array.from(currentTagMap.keys());

    // 3. Compute diff.
    const tagsToAdd = desiredNames.filter((n) => !currentNames.includes(n));
    const tagsToRemove = currentNames.filter((n) => !desiredNames.includes(n));

    // 4. Remove join rows for removed tags.
    for (const name of tagsToRemove) {
      const joinRow = currentTagMap.get(name);
      if (joinRow) {
        await ctx.db.delete(joinRow._id);
      }
    }

    // 5. Upsert tags and add join rows for added tags.
    for (const name of tagsToAdd) {
      const tag = await upsertTagByName(ctx, userId, name);
      // Prevent duplicate join rows (defensive check).
      const existingJoin = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_bookmark", (q: any) =>
          q.eq("bookmarkId", args.bookmarkId),
        )
        .filter((q: any) => q.eq(q.field("tagId"), tag._id))
        .first();

      if (!existingJoin) {
        await ctx.db.insert("bookmarkTags", {
          bookmarkId: args.bookmarkId,
          tagId: tag._id,
          userId,
        });
      }
    }

    // 6. Return final tag list.
    const finalJoinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.bookmarkId))
      .take(200);

    const finalTags: TagDTO[] = [];
    for (const row of finalJoinRows) {
      const tag = await ctx.db.get(row.tagId);
      if (tag) {
        finalTags.push(await resolveTagDTO(tag));
      }
    }
    return finalTags;
  },
});

// ---------------------------------------------------------------------------
// setBookmarkTags — takes known tag IDs (used by processing pipeline)
// ---------------------------------------------------------------------------

export const setBookmarkTags = authMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args): Promise<TagDTO[]> => {
    const userId = ctx.user.id;

    // Assert bookmark ownership.
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    // Verify all tagIds belong to userId.
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (!tag || tag.userId !== userId) {
        throwNotFound("Tag not found");
      }
    }

    // Fetch current join rows.
    const currentRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.bookmarkId))
      .take(200);

    const currentIds = new Set(currentRows.map((r: any) => r.tagId as string));
    const desiredIds = new Set(args.tagIds.map((id) => id as string));

    // Remove rows not in desired set.
    for (const row of currentRows) {
      if (!desiredIds.has(row.tagId as string)) {
        await ctx.db.delete(row._id);
      }
    }

    // Add rows for new tag IDs.
    for (const tagId of args.tagIds) {
      if (!currentIds.has(tagId as string)) {
        await ctx.db.insert("bookmarkTags", {
          bookmarkId: args.bookmarkId,
          tagId,
          userId,
        });
      }
    }

    // Return final list.
    const finalRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.bookmarkId))
      .take(200);

    const finalTags: TagDTO[] = [];
    for (const row of finalRows) {
      const tag = await ctx.db.get(row.tagId);
      if (tag) {
        finalTags.push(await resolveTagDTO(tag));
      }
    }
    return finalTags;
  },
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

export const remove = authMutation({
  args: {
    id: v.id("tags"),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;
    const tag = await ctx.db.get(args.id);

    if (!tag || tag.userId !== userId) {
      throwNotFound("Tag not found");
    }

    // Delete all bookmarkTags join rows for this tag.
    const joinRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_tag", (q: any) => q.eq("tagId", args.id))
      .take(500);
    for (const row of joinRows) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// ---------------------------------------------------------------------------
// bulkDelete
// ---------------------------------------------------------------------------

export const bulkDelete = authMutation({
  args: {
    tagIds: v.array(v.id("tags")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    deletedTags: Array<{ id: string; name: string }>;
    totalBookmarksAffected: number;
  }> => {
    const userId = ctx.user.id;

    // Verify all tags belong to user.
    const tags: any[] = [];
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (!tag || tag.userId !== userId) {
        throwNotFound("Tag not found or does not belong to user");
      }
      tags.push(tag);
    }

    const affectedBookmarkIds = new Set<string>();

    // Delete join rows and collect affected bookmark IDs.
    for (const tag of tags) {
      const joinRows = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_tag", (q: any) => q.eq("tagId", tag._id))
        .take(500);
      for (const row of joinRows) {
        affectedBookmarkIds.add(row.bookmarkId as string);
        await ctx.db.delete(row._id);
      }
    }

    // Delete tags.
    const deletedTags: Array<{ id: string; name: string }> = [];
    for (const tag of tags) {
      deletedTags.push({ id: tag._id as string, name: tag.name as string });
      await ctx.db.delete(tag._id);
    }

    return {
      deletedTags,
      totalBookmarksAffected: affectedBookmarkIds.size,
    };
  },
});

// ---------------------------------------------------------------------------
// refactor — bulk tag merge
// ---------------------------------------------------------------------------

export const refactor = authMutation({
  args: {
    refactors: v.array(
      v.object({
        bestTag: v.string(),
        refactorTagIds: v.array(v.id("tags")),
        createBestTag: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = ctx.user.id;

    const results: Array<{
      bestTag: string;
      refactoredTags: string[];
      bookmarksAffected: number;
      tagsRemoved: number;
      created: boolean;
    }> = [];

    for (const op of args.refactors) {
      // Verify source tags belong to user.
      const sourceTags: any[] = [];
      for (const tagId of op.refactorTagIds) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== userId) {
          throwNotFound(`Source tag not found: ${tagId}`);
        }
        sourceTags.push(tag);
      }

      // Find or create the best tag.
      let bestTagDoc = await ctx.db
        .query("tags")
        .withIndex("by_user_name", (q: any) =>
          q.eq("userId", userId).eq("name", op.bestTag),
        )
        .first();

      let created = false;
      if (!bestTagDoc) {
        if (op.createBestTag) {
          const bestTagId = await ctx.db.insert("tags", {
            userId,
            name: op.bestTag,
            type: "USER",
          });
          bestTagDoc = await ctx.db.get(bestTagId);
          created = true;
        } else {
          throwValidationError(
            `Best tag '${op.bestTag}' doesn't exist. Set createBestTag to true to create it.`,
          );
        }
      }

      if (!bestTagDoc) {
        continue;
      }

      // Collect all join rows for source tags.
      const affectedBookmarkIds = new Set<string>();
      for (const tag of sourceTags) {
        const joinRows = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_tag", (q: any) => q.eq("tagId", tag._id))
          .take(500);
        for (const row of joinRows) {
          affectedBookmarkIds.add(row.bookmarkId as string);
        }
      }

      // For each affected bookmark, ensure a join row for the best tag exists.
      for (const bookmarkId of affectedBookmarkIds) {
        const existing = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", bookmarkId))
          .filter((q: any) => q.eq(q.field("tagId"), bestTagDoc._id))
          .first();

        if (!existing) {
          await ctx.db.insert("bookmarkTags", {
            bookmarkId: bookmarkId as Id<"bookmarks">,
            tagId: bestTagDoc._id,
            userId,
          });
        }
      }

      // Delete all join rows for source tags.
      for (const tag of sourceTags) {
        const joinRows = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_tag", (q: any) => q.eq("tagId", tag._id))
          .take(500);
        for (const row of joinRows) {
          await ctx.db.delete(row._id);
        }
      }

      // Delete source tags.
      for (const tag of sourceTags) {
        await ctx.db.delete(tag._id);
      }

      results.push({
        bestTag: op.bestTag,
        refactoredTags: sourceTags.map((t) => t.name as string),
        bookmarksAffected: affectedBookmarkIds.size,
        tagsRemoved: sourceTags.length,
        created,
      });
    }

    const totalBookmarksAffected = results.reduce(
      (sum, r) => sum + r.bookmarksAffected,
      0,
    );
    const totalTagsRemoved = results.reduce((sum, r) => sum + r.tagsRemoved, 0);

    return {
      success: true,
      results,
      summary: {
        operationsApplied: results.length,
        totalBookmarksAffected,
        totalTagsRemoved,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// setBookmarkTagsByNameInternal — pipeline-only: upsert tags with explicit type
// ---------------------------------------------------------------------------

export const setBookmarkTagsByNameInternal = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tagNames: v.array(v.string()),
    userId: v.string(),
    type: v.optional(v.union(v.literal("USER"), v.literal("IA"))),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const tagType = args.type ?? "IA";

    const desiredNames = Array.from(
      new Set(args.tagNames.map((n) => n.trim()).filter((n) => n.length > 0)),
    );

    for (const name of desiredNames) {
      // Upsert tag with the given type
      let tag = await ctx.db
        .query("tags")
        .withIndex("by_user_name", (q: any) =>
          q.eq("userId", args.userId).eq("name", name),
        )
        .first();

      if (!tag) {
        const tagId = await ctx.db.insert("tags", {
          userId: args.userId,
          name,
          type: tagType,
        });
        tag = await ctx.db.get(tagId);
      }

      if (!tag) continue;

      // Upsert join row
      const existingJoin = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_bookmark", (q: any) =>
          q.eq("bookmarkId", args.bookmarkId),
        )
        .filter((q: any) => q.eq(q.field("tagId"), tag!._id))
        .first();

      if (!existingJoin) {
        await ctx.db.insert("bookmarkTags", {
          bookmarkId: args.bookmarkId,
          tagId: tag._id,
          userId: args.userId,
        });
      }
    }

    return null;
  },
});
