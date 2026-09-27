/**
 * migration/split_embeddings.ts — one-off move of the legacy inline
 * `bookmarks.searchEmbedding` vector into `bookmarkEmbeddings`.
 *
 * Run once after deploy:
 *   npx convex run migration/split_embeddings:run --prod
 *
 * Each batch schedules the next until the table has been scanned. Re-running
 * is safe: migrated rows no longer carry `searchEmbedding`.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { writeBookmarkEmbedding } from "../bookmarks/embeddings";

// ~15 KB read + ~15 KB written per migrated row keeps a batch near 3 MB.
const BATCH_SIZE = 100;

export const run = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("bookmarks")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });

    let moved = 0;
    for (const bookmark of page.page) {
      if (!bookmark.searchEmbedding) continue;
      if (bookmark.embeddingModel && bookmark.searchEmbedding.length > 0) {
        await ctx.db.patch(
          bookmark._id,
          await writeBookmarkEmbedding(
            ctx,
            bookmark,
            bookmark.searchEmbedding,
            bookmark.embeddingModel,
          ),
        );
      } else {
        // Unusable vector: drop it so the reembed job treats it as missing.
        await ctx.db.patch(bookmark._id, { searchEmbedding: undefined });
      }
      moved++;
    }

    console.log("[migration.splitEmbeddings]", {
      scanned: page.page.length,
      moved,
      cursor: page.continueCursor,
      isDone: page.isDone,
    });

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migration.split_embeddings.run, {
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
