import {
  getLimits as getPlansLimits,
  isActiveSubscriptionStatus,
  parseCustomLimits,
} from "../billing/plans";
import { authQuery } from "../functions";

/**
 * getLimits — authQuery
 *
 * Returns the authenticated user's plan, limits, custom overrides, and
 * subscription summary.
 *
 * Return shape: UserLimits (Contract §C)
 * Spec 12 §2.3, Contract §A users/queries.ts
 */
export const getLimits = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user.id;

    // Fetch active subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const plan: "free" | "pro" =
      sub && isActiveSubscriptionStatus(sub.status ?? null, sub.provider)
        ? "pro"
        : "free";

    const metadata = (ctx.user as { metadata?: unknown }).metadata;
    const limits = getPlansLimits(plan, metadata);
    const customLimits = parseCustomLimits(metadata);

    const subscription = sub
      ? {
          id: sub._id as string,
          status: sub.status ?? "unknown",
          periodEnd: sub.periodEnd ?? null,
        }
      : null;

    return {
      plan,
      limits: limits as {
        bookmarks: number;
        monthlyBookmarkRuns: number;
        monthlyChatQueries: number;
        canExport: number;
        apiAccess: number;
      },
      customLimits: customLimits as Partial<{
        bookmarks: number;
        monthlyBookmarkRuns: number;
        monthlyChatQueries: number;
        canExport: number;
        apiAccess: number;
      }>,
      subscription,
    };
  },
});
