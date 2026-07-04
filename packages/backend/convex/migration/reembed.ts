"use node";

/**
 * migration/reembed.ts — Node-runtime action that pages through bookmarks with
 * missing, malformed, or stale search embeddings and fills them in using Gemini.
 *
 * Architecture:
 *  - reembedBatch (internalAction): called recursively via scheduler to avoid
 *    hitting Convex action time limits.  Throttled with a 2 s delay between
 *    batches to respect Gemini rate limits.
 *  - startReembed (public mutation, ALLOW_MIGRATION-gated): kicks off the first
 *    batch and is called by the migration script after importConversations.
 *
 * Helpers (queries + mutations) live in reembed_helpers.ts (default runtime)
 * because a "use node" file cannot define Convex queries or mutations directly.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../functions";
import { embedDocument, EMBEDDING_MODEL_KEY } from "../processing/embeddings";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { throwForbidden } from "../utils/errors";

// Batch size: embed up to 20 bookmarks per action invocation.
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;

type ReembedBatchStats = {
  scanned: number;
  candidates: number;
  embedded: number;
  skipped: number;
  failed: number;
  continueCursor: string | null;
  scheduledNext: boolean;
};

type BookmarkNeedingEmbedding = {
  id: Id<"bookmarks">;
  title: string | null;
  vectorSummary: string | null;
  summary: string | null;
  reason: "missingEmbedding" | "invalidDimensions" | "staleModel";
};

type PageNeedingEmbeddingResult = {
  page: BookmarkNeedingEmbedding[];
  continueCursor: string | null;
  isDone: boolean;
  scanned: number;
};

type TargetedBookmarkForEmbedding = {
  id: Id<"bookmarks">;
  title: string | null;
  vectorSummary: string | null;
  summary: string | null;
};

type EmbedExactStats = {
  embedded: number;
  skipped: number;
  failed: number;
};

function clampBatchSize(batchSize: number | undefined): number {
  const value = batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isFinite(value)) return DEFAULT_BATCH_SIZE;
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.trunc(value)));
}

function assertMigrationAllowed(migrationSecret: string): void {
  if (process.env.ALLOW_MIGRATION !== "true") {
    throwForbidden("Migration not enabled");
  }
  const expectedSecret = process.env.MIGRATION_SECRET;
  if (!expectedSecret || migrationSecret !== expectedSecret) {
    throwForbidden("Migration not authorized");
  }
}

function buildEmbeddingText(doc: TargetedBookmarkForEmbedding): string {
  const titlePart = doc.title?.trim() ?? "";
  const bodyPart = doc.vectorSummary?.trim() || doc.summary?.trim() || "";
  return bodyPart ? `${titlePart}\n${bodyPart}`.trim() : titlePart;
}

async function embedExactBookmarks(
  ctx: ActionCtx,
  docs: TargetedBookmarkForEmbedding[],
): Promise<EmbedExactStats> {
  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const text = buildEmbeddingText(doc);

    if (!text) {
      skipped += 1;
      console.warn(`[reembed] skipped bookmark ${doc.id}: empty text`);
      continue;
    }

    try {
      const embedding = await embedDocument(text);
      await ctx.runMutation(internal.migration.reembed_helpers.patchEmbedding, {
        id: doc.id,
        embedding,
        model: EMBEDDING_MODEL_KEY,
      });
      embedded += 1;
    } catch (err) {
      console.error(`[reembed] failed for bookmark ${doc.id}:`, err);
      failed += 1;
    }
  }

  return { embedded, skipped, failed };
}

// ---------------------------------------------------------------------------
// reembedBatch — internalAction ("use node")
// ---------------------------------------------------------------------------

/**
 * reembedBatch — pages through bookmarks needing re-embedding.
 *
 * Flow:
 *   1. Fetch a page of bookmarks needing search embedding repair via internalQuery.
 *   2. For each bookmark, build text = `${title}\n${vectorSummary ?? summary ?? ""}`.trim()
 *   3. If text is empty, skip (can't embed empty string).
 *   4. Call embedDocument(text) → patch searchEmbedding + embeddingModel.
 *   5. If more pages remain, schedule next batch after 2 s.
 */
export const reembedBatch = internalAction({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
    jobId: v.optional(v.id("searchEmbeddingRepairJobs")),
  },
  returns: v.object({
    scanned: v.number(),
    candidates: v.number(),
    embedded: v.number(),
    skipped: v.number(),
    failed: v.number(),
    continueCursor: v.union(v.string(), v.null()),
    scheduledNext: v.boolean(),
  }),
  handler: async (
    ctx,
    { cursor, batchSize, jobId },
  ): Promise<ReembedBatchStats> => {
    const limit = clampBatchSize(batchSize);

    // Fetch a page of bookmarks needing embedding (default runtime helper).
    const {
      page,
      continueCursor,
      isDone,
      scanned,
    }: PageNeedingEmbeddingResult = await ctx.runQuery(
      internal.migration.reembed_helpers.pageNeedingEmbedding,
      {
        cursor,
        limit,
      },
    );

    const { embedded, skipped, failed } = await embedExactBookmarks(ctx, page);

    // Schedule next batch if more remain.
    const scheduledNext = !isDone && continueCursor !== null;
    if (!isDone && continueCursor !== null) {
      await ctx.scheduler.runAfter(
        2_000,
        internal.migration.reembed.reembedBatch,
        jobId === undefined
          ? { cursor: continueCursor, batchSize: limit }
          : { cursor: continueCursor, batchSize: limit, jobId },
      );
    } else {
      console.log("[reembed] Re-embedding complete.");
    }

    const stats: ReembedBatchStats = {
      scanned,
      candidates: page.length,
      embedded,
      skipped,
      failed,
      continueCursor,
      scheduledNext,
    };
    if (jobId !== undefined) {
      await ctx.runMutation(
        internal.migration.reembed_helpers.recordReembedBatchStats,
        { jobId, ...stats },
      );
    }
    console.log("[reembed] batch complete", stats);
    return stats;
  },
});

/**
 * reembedBookmarks — public, ALLOW_MIGRATION-gated targeted embedding action.
 * It embeds only the provided bookmark IDs, avoiding the full-table scan used
 * by reembedBatch.
 */
export const reembedBookmarks = action({
  args: {
    migrationSecret: v.string(),
    bookmarkIds: v.array(v.id("bookmarks")),
  },
  returns: v.object({
    embedded: v.number(),
    skipped: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, { migrationSecret, bookmarkIds }) => {
    assertMigrationAllowed(migrationSecret);
    const uniqueIds = Array.from(new Set(bookmarkIds));
    if (uniqueIds.length === 0) {
      return { embedded: 0, skipped: 0, failed: 0 };
    }

    const docs: TargetedBookmarkForEmbedding[] = await ctx.runQuery(
      internal.migration.reembed_helpers.getBookmarksForReembed,
      { ids: uniqueIds },
    );
    const stats = await embedExactBookmarks(ctx, docs);
    const missing = uniqueIds.length - docs.length;
    if (missing > 0) {
      console.warn(`[reembed] ${missing} requested bookmark IDs were missing`);
    }
    return { ...stats, skipped: stats.skipped + missing };
  },
});

// startReembed (the public gated kickoff) lives in reembed_helpers.ts — it is a
// mutation and cannot be defined in this "use node" file.
