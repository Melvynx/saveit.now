import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Count bookmarks for a given user (used by drip step functions to decide
 * whether to send conditional emails). Reads the denormalized userCounters
 * table to avoid unbounded scans.
 */
export const countBookmarks = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const counter = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return counter?.bookmarkCount ?? 0;
  },
});
