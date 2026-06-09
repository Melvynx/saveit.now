import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

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

    // Read up to 500 counters that are stale (different monthKey).
    // Process in batches to avoid transaction limits.
    const stale = await ctx.db
      .query("userCounters")
      .take(500);

    let resetCount = 0;
    for (const counter of stale) {
      if (counter.monthKey !== currentMonthKey) {
        await ctx.db.patch(counter._id, {
          monthKey: currentMonthKey,
          monthlyRuns: 0,
          monthlyChatQueries: 0,
        });
        resetCount++;
      }
    }

    console.log("[crons.monthlyCounterReset] reset", resetCount, "counters for month", currentMonthKey);

    // If there might be more, schedule another pass.
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

// ---------------------------------------------------------------------------
// Stale processing reset
// ---------------------------------------------------------------------------

/**
 * Resets bookmarks stuck in PROCESSING status for > 30 minutes back to PENDING.
 * Runs every hour.
 *
 * Strategy: bounded scan of bookmarks ordered by _creationTime (default index),
 * take 200 and filter for PROCESSING + old updatedAt. This avoids a full table
 * scan while keeping within transaction limits. An alternative would be a
 * dedicated "by_status_updated" index, but schema is frozen.
 */
export const staleProcessingResetJob = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    // Bounded scan: take the most recent 500 bookmarks and find any stuck in
    // PROCESSING. Real-world PROCESSING set is small; this covers normal cases.
    const candidates = await ctx.db
      .query("bookmarks")
      .order("desc")
      .take(500);

    let resetCount = 0;
    for (const bookmark of candidates) {
      if (
        bookmark.status === "PROCESSING" &&
        bookmark.updatedAt < thirtyMinutesAgo
      ) {
        await ctx.db.patch(bookmark._id, {
          status: "PENDING",
          processingError: undefined,
        });
        resetCount++;
      }
    }

    if (resetCount > 0) {
      console.log("[crons.staleProcessingReset] reset", resetCount, "stale bookmarks");
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

export default crons;
