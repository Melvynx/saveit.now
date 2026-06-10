import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { isActiveSubscriptionStatus } from "../billing/plans";

/**
 * getActiveSubscriptionForUser — internalQuery
 *
 * Returns the user's active subscription (plan field), or null if none.
 * Used by validateApiKey to determine plan without importing the full
 * subscriptions module.
 */
export const getActiveSubscriptionForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!sub || !isActiveSubscriptionStatus(sub.status)) return null;
    return { plan: sub.plan as "free" | "pro", status: sub.status ?? null };
  },
});
