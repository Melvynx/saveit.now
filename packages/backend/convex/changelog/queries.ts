import { v } from "convex/values";
import { authQuery } from "../functions";

/**
 * checkDismissed — authQuery
 *
 * Returns whether the authenticated user has dismissed a given changelog version.
 * Backed by the changelogDismissals table (replaces Redis).
 *
 * Spec 12 §4.8, Contract §A changelog/queries.ts
 */
export const checkDismissed = authQuery({
  args: {
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    const record = await ctx.db
      .query("changelogDismissals")
      .withIndex("by_user_version", (q) =>
        q.eq("userId", userId).eq("version", args.version),
      )
      .first();

    return { isDismissed: record !== null };
  },
});
