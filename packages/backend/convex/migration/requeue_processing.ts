import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const MAX_IDS_PER_CALL = 100;
const STAGGER_MS = 2000;

/**
 * Support repair: re-run the processing workflow for bookmarks that failed
 * before a pipeline fix shipped. Skips rows that are already queued.
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
        { bookmarkId: id, userId: bookmark.userId },
      );
      queued++;
    }

    return { queued, skipped };
  },
});
