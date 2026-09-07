import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import {
  deriveEffectivePlan,
  pickCanonicalSubscription,
} from "../billing/plans";

const SUBSCRIPTION_PER_USER_LIMIT = 20;

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
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(SUBSCRIPTION_PER_USER_LIMIT);
    const subscription = pickCanonicalSubscription(subscriptions);
    const plan = deriveEffectivePlan(subscription);
    if (plan !== "pro") {
      return null;
    }
    return { plan, status: subscription?.status ?? null };
  },
});
