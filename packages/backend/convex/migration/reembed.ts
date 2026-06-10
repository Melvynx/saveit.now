"use node";

/**
 * migration/reembed.ts — Node-runtime action that pages through all bookmarks
 * lacking a current searchEmbedding and fills them in using Gemini.
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
import { internalAction } from "../functions";
import { embedDocument, EMBEDDING_MODEL_KEY } from "../processing/embeddings";

// Batch size: embed up to 20 bookmarks per action invocation.
const BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// reembedBatch — internalAction ("use node")
// ---------------------------------------------------------------------------

/**
 * reembedBatch — pages through bookmarks needing re-embedding.
 *
 * Flow:
 *   1. Fetch a page of bookmarks lacking current embeddingModel via internalQuery.
 *   2. For each bookmark, build text = `${title}\n${vectorSummary ?? summary ?? ""}`.trim()
 *   3. If text is empty, skip (can't embed empty string).
 *   4. Call embedDocument(text) → patch searchEmbedding + embeddingModel.
 *   5. If more pages remain, schedule next batch after 2 s.
 */
export const reembedBatch = internalAction({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    // Fetch a page of bookmarks needing embedding (default runtime helper).
    const { page, continueCursor, isDone } = await ctx.runQuery(
      internal.migration.reembed_helpers.pageNeedingEmbedding,
      { cursor, limit: BATCH_SIZE },
    );

    for (const doc of page) {
      const titlePart = doc.title?.trim() ?? "";
      const bodyPart =
        doc.vectorSummary?.trim() || doc.summary?.trim() || "";
      const text = bodyPart ? `${titlePart}\n${bodyPart}`.trim() : titlePart;

      if (!text) {
        // Nothing to embed — skip silently.
        continue;
      }

      try {
        const embedding = await embedDocument(text);
        await ctx.runMutation(
          internal.migration.reembed_helpers.patchEmbedding,
          {
            id: doc.id,
            embedding,
            model: EMBEDDING_MODEL_KEY,
          },
        );
      } catch (err) {
        // Log and continue — a failed embed should not abort the whole batch.
        console.error(`[reembed] failed for bookmark ${doc.id}:`, err);
      }
    }

    // Schedule next batch if more remain.
    if (!isDone && continueCursor !== null) {
      await ctx.scheduler.runAfter(
        2_000,
        internal.migration.reembed.reembedBatch,
        { cursor: continueCursor },
      );
    } else {
      console.log("[reembed] Re-embedding complete.");
    }

    return null;
  },
});

// startReembed (the public gated kickoff) lives in reembed_helpers.ts — it is a
// mutation and cannot be defined in this "use node" file.
