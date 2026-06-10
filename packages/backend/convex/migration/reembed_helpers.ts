/**
 * migration/reembed_helpers.ts — Default-runtime (no "use node") helpers for
 * the re-embed pass.  The "use node" action in reembed.ts cannot define queries
 * or mutations, so they live here and are called via ctx.runQuery / ctx.runMutation.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation } from "../functions";
import { throwForbidden } from "../utils/errors";

// Keep in sync with processing/embeddings.ts (cannot import "use node" module here).
const CURRENT_EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536";

function assertMigrationAllowed(migrationSecret: string): void {
  if (process.env.ALLOW_MIGRATION !== "true") {
    throwForbidden("Migration not enabled");
  }
  const expectedSecret = process.env.MIGRATION_SECRET;
  if (!expectedSecret || migrationSecret !== expectedSecret) {
    throwForbidden("Migration not authorized");
  }
}

/**
 * startReembed — public, ALLOW_MIGRATION-gated. Schedules the first reembedBatch.
 * Call from the migration script after all data is imported.
 */
export const startReembed = mutation({
  args: { migrationSecret: v.string() },
  returns: v.null(),
  handler: async (ctx, { migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);
    await ctx.scheduler.runAfter(0, internal.migration.reembed.reembedBatch, {
      cursor: null,
    });
    console.log("[reembed] Scheduled first reembedBatch.");
    return null;
  },
});

// ---------------------------------------------------------------------------
// pageNeedingEmbedding
// ---------------------------------------------------------------------------

/**
 * pageNeedingEmbedding — returns a page of bookmarks whose embeddingModel does
 * NOT equal the current key (i.e. they need re-embedding).
 *
 * Paginates the full bookmarks table by _creationTime (no userId filter) and
 * post-filters by embeddingModel.  The action must call this repeatedly until
 * isDone is true.
 *
 * Returns: { page, continueCursor, isDone }
 *   page: array of { id, title, vectorSummary, summary }
 */
export const pageNeedingEmbedding = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.string(),
        title: v.union(v.string(), v.null()),
        vectorSummary: v.union(v.string(), v.null()),
        summary: v.union(v.string(), v.null()),
      }),
    ),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, limit }) => {
    const paginationResult = await ctx.db
      .query("bookmarks")
      .paginate({ cursor: cursor ?? null, numItems: limit });

    // Post-filter: only rows lacking the current embedding model.
    const needsEmbed = paginationResult.page.filter(
      (doc) => doc.embeddingModel !== CURRENT_EMBEDDING_MODEL_KEY,
    );

    return {
      page: needsEmbed.map((doc) => ({
        id: doc._id as string,
        title: doc.title ?? null,
        vectorSummary: doc.vectorSummary ?? null,
        summary: doc.summary ?? null,
      })),
      continueCursor: paginationResult.isDone
        ? null
        : paginationResult.continueCursor,
      isDone: paginationResult.isDone,
    };
  },
});

// ---------------------------------------------------------------------------
// patchEmbedding
// ---------------------------------------------------------------------------

/**
 * patchEmbedding — patches searchEmbedding + embeddingModel on a single bookmark.
 * Called from the "use node" reembedBatch action via ctx.runMutation.
 */
export const patchEmbedding = internalMutation({
  args: {
    id: v.string(),
    embedding: v.array(v.float64()),
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, embedding, model }) => {
    const docId = ctx.db.normalizeId("bookmarks", id);
    if (!docId) return null;
    await ctx.db.patch(docId, {
      searchEmbedding: embedding,
      embeddingModel: model,
    });
    return null;
  },
});
