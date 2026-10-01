import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const MAX_IDS_PER_CALL = 100;
const STAGGER_MS = 2000;

/**
 * Support repair: re-run the processing workflow for bookmarks that failed
 * before a pipeline fix shipped. Skips rows that are already queued. Repair
 * runs are non-billable: they bypass and don't consume the monthly quota.
 *
 *   npx convex run --prod migration/requeue_processing:requeue '{"ids":["…"]}'
 */
export const requeue = internalMutation({
  args: { ids: v.array(v.id("bookmarks")) },
  returns: v.object({ queued: v.number(), skipped: v.number() }),
  handler: async (ctx, { ids }) => {
    if (ids.length > MAX_IDS_PER_CALL) {
      throw new Error(`Pass at most ${MAX_IDS_PER_CALL} ids per call`);
    }

    let queued = 0;
    let skipped = 0;
    for (const id of ids) {
      const bookmark = await ctx.db.get(id);
      if (
        !bookmark ||
        bookmark.status === "PENDING" ||
        bookmark.status === "PROCESSING"
      ) {
        skipped++;
        continue;
      }

      await ctx.db.patch(id, {
        status: "PENDING",
        processingStep: 0,
        processingError: undefined,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        queued * STAGGER_MS,
        internal.processing.workflow.kickoff,
        { bookmarkId: id, userId: bookmark.userId, billable: false },
      );
      queued++;
    }

    return { queued, skipped };
  },
});

/**
 * Marks runs started at or after `since` for these bookmarks as
 * non-billable, giving the quota back after a repair that predates
 * `requeue` being non-billable.
 */
export const refundRuns = internalMutation({
  args: { ids: v.array(v.id("bookmarks")), since: v.number() },
  returns: v.object({ refunded: v.number() }),
  handler: async (ctx, { ids, since }) => {
    if (ids.length > MAX_IDS_PER_CALL) {
      throw new Error(`Pass at most ${MAX_IDS_PER_CALL} ids per call`);
    }

    let refunded = 0;
    for (const bookmarkId of ids) {
      const runs = await ctx.db
        .query("bookmarkProcessingRuns")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
        .order("desc")
        .take(10);
      for (const run of runs) {
        if (run.startedAt < since || run.billable === false) continue;
        await ctx.db.patch(run._id, { billable: false });
        refunded++;
      }
    }
    return { refunded };
  },
});
