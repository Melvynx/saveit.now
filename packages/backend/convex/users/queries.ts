import {
  deriveEffectivePlan,
  getLimits as getPlansLimits,
  parseCustomLimits,
} from "../billing/plans";
import { components } from "../_generated/api";
import { authQuery } from "../functions";
import { deriveOnboardingFlowState } from "./onboarding";

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

    const plan = deriveEffectivePlan(sub);

    const dbUser = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });
    const metadata = (dbUser as { metadata?: unknown } | null)?.metadata;
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

/** One reactive snapshot for routing the authenticated onboarding flow. */
export const getOnboardingFlowState = authQuery({
  args: {},
  handler: async (ctx) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user.id))
      .first();

    return deriveOnboardingFlowState({
      onboarding: ctx.user.onboarding,
      offerChoice: ctx.user.onboardingUpgradeChoice,
      effectivePlan: deriveEffectivePlan(subscription),
    });
  },
});
