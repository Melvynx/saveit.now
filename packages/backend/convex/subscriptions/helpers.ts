import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { deriveEffectivePlan, getCanonicalSubscription } from "../billing/plans";

/** Server-only entitlement check for actions that cannot access ctx.db. */
export const getEffectivePlanForUser = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.literal("free"), v.literal("pro")),
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return deriveEffectivePlan(getCanonicalSubscription(subscriptions));
  },
});
