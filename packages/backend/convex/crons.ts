import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { failProcessing } from "./processing/runs";

const STALE_PROCESSING_MS = 30 * 60 * 1000;
const STALE_PROCESSING_HANDLE_LIMIT = 25;
const STALE_PROCESSING_MAX_ATTEMPTS = 3;
const STALE_PROCESSING_STAGGER_MS = 250;

// ---------------------------------------------------------------------------
// Monthly counter reset
// ---------------------------------------------------------------------------

/**
 * Resets userCounters monthly fields where monthKey !== currentMonthKey.
 * Runs on the 1st of each month at 00:00 UTC.
 */
export const monthlyCounterResetJob = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Only read counters whose monthKey is stale (lexicographic "YYYY-MM"
    // comparison works for zero-padded month keys). Patched rows leave the
    // index range, so each pass reads a fresh batch and the job terminates.
    const stale = await ctx.db
      .query("userCounters")
      .withIndex("by_monthKey", (q) => q.lt("monthKey", currentMonthKey))
      .take(500);

    for (const counter of stale) {
      await ctx.db.patch(counter._id, {
        monthKey: currentMonthKey,
        monthlyRuns: 0,
        monthlyChatQueries: 0,
      });
    }

    console.log(
      "[crons.monthlyCounterReset] reset",
      stale.length,
      "counters for month",
      currentMonthKey,
    );

    // Only continue if this batch was full — meaning more stale rows may remain.
    if (stale.length === 500) {
      await ctx.scheduler.runAfter(
        0,
        internal.crons.monthlyCounterResetJob,
        {},
      );
    }

    return null;
  },
});

/**
 * KILLSWITCH: cancels all pending scheduled runs of monthlyCounterResetJob.
 * Run manually: npx convex run crons:cancelRunawayCounterReset
 */
export const cancelRunawayCounterReset = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Pending runs are the newest rows — the loop reschedules with runAfter(0).
    // Bounded scan of the most recent 2000 entries only.
    const recent = await ctx.db.system
      .query("_scheduled_functions")
      .order("desc")
      .take(2000);

    let cancelled = 0;
    for (const job of recent) {
      if (
        job.state.kind === "pending" &&
        job.name.includes("monthlyCounterResetJob")
      ) {
        await ctx.scheduler.cancel(job._id);
        cancelled++;
      }
    }

    console.log(
      "[crons.cancelRunawayCounterReset] cancelled",
      cancelled,
      "pending jobs",
    );
    return cancelled;
  },
});

// ---------------------------------------------------------------------------
// Stale processing reset
// ---------------------------------------------------------------------------

/**
 * Resets bookmarks stuck in PROCESSING status for > 30 minutes, then re-kicks
 * processing. Runs every hour.
 */
async function countProcessingAttempts(
  ctx: MutationCtx,
  bookmarkId: Id<"bookmarks">,
): Promise<number> {
  const runs = await ctx.db
    .query("bookmarkProcessingRuns")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
    .take(STALE_PROCESSING_MAX_ATTEMPTS);

  return runs.length;
}

export const staleProcessingResetJob = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleBefore = now - STALE_PROCESSING_MS;

    const candidates = await ctx.db
      .query("bookmarks")
      .withIndex("by_status_and_updatedAt", (q) =>
        q.eq("status", "PROCESSING").lt("updatedAt", staleBefore),
      )
      .take(STALE_PROCESSING_HANDLE_LIMIT);

    let resetCount = 0;
    let failedCount = 0;
    let scheduledCount = 0;
    for (const bookmark of candidates) {
      const attemptCount = await countProcessingAttempts(ctx, bookmark._id);
      if (attemptCount >= STALE_PROCESSING_MAX_ATTEMPTS) {
        await failProcessing(
          ctx,
          bookmark._id,
          "Processing exceeded stale restart attempts",
        );
        failedCount++;
      } else {
        await ctx.db.patch(bookmark._id, {
          status: "PENDING",
          processingStep: 0,
          processingError: undefined,
          updatedAt: now,
        });
        await ctx.scheduler.runAfter(
          scheduledCount * STALE_PROCESSING_STAGGER_MS,
          internal.processing.workflow.kickoff,
          { bookmarkId: bookmark._id, userId: bookmark.userId },
        );
        resetCount++;
        scheduledCount++;
      }
    }

    if (resetCount > 0 || failedCount > 0) {
      console.log("[crons.staleProcessingReset]", {
        reset: resetCount,
        scheduled: scheduledCount,
        failed: failedCount,
        scanned: candidates.length,
      });
    }

    if (candidates.length === STALE_PROCESSING_HANDLE_LIMIT) {
      await ctx.scheduler.runAfter(
        0,
        internal.crons.staleProcessingResetJob,
        {},
      );
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Cron job registrations
// ---------------------------------------------------------------------------

const crons = cronJobs();

// "0 0 1 * *" — 1st of month at 00:00 UTC
crons.cron(
  "monthlyCounterReset",
  "0 0 1 * *",
  internal.crons.monthlyCounterResetJob,
  {},
);

// "0 * * * *" — every hour at :00
crons.cron(
  "staleProcessingReset",
  "0 * * * *",
  internal.crons.staleProcessingResetJob,
  {},
);

crons.cron(
  "emailOtpRateLimitCleanup",
  "15 * * * *",
  internal.auth.rateLimit.cleanupEmailOtpRateLimits,
  {},
);

export default crons;
