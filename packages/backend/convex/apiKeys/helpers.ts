import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { deriveEffectivePlan } from "../billing/plans";

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
    const plan = deriveEffectivePlan(sub);
    if (plan !== "pro") {
      return null;
    }
    return { plan, status: sub?.status ?? null };
  },
});
