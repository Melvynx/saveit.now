/**
 * subscriptions/queries.ts — Subscription read endpoints.
 * Default runtime (no "use node").
 */

import { components } from "../_generated/api";
import { authQuery } from "../functions";
import {
  deriveEffectivePlan,
  getLimits,
  parseCustomLimits,
} from "../billing/plans";
import type { Id } from "../_generated/dataModel";

/**
 * SubscriptionDTO shape.
 */
type SubscriptionDTO = {
  _id: Id<"subscriptions">;
  id: string;
  userId: string;
  plan: "free" | "pro";
  provider: "stripe" | "appstore" | null;
  status: string | null;
  appstoreProductId: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  createdAt: number;
  updatedAt: number;
};

/**
 * UserLimits shape per Contract §C.
 */
type UserLimits = {
  plan: "free" | "pro";
  limits: {
    bookmarks: number;
    monthlyBookmarkRuns: number;
    monthlyChatQueries: number;
    canExport: number;
    apiAccess: number;
  };
  customLimits: Partial<{
    bookmarks: number;
    monthlyBookmarkRuns: number;
    monthlyChatQueries: number;
    canExport: number;
    apiAccess: number;
  }>;
  subscription: {
    id: string;
    status: string;
    provider: "stripe" | "appstore" | null;
    appstoreProductId: string | null;
    periodEnd: number | null;
  } | null;
};

/**
 * getMine — returns the calling user's subscription row (or null if none).
 * Callers treat null as free-plan.
 */
export const getMine = authQuery({
  args: {},
  handler: async (ctx): Promise<SubscriptionDTO | null> => {
    const { user } = ctx;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();

    if (!sub) return null;

    return {
      _id: sub._id,
      id: sub._id,
      userId: sub.userId,
      plan: deriveEffectivePlan(sub),
      provider: sub.provider ?? null,
      status: sub.status ?? null,
      appstoreProductId: sub.appstoreProductId ?? null,
      periodStart: sub.periodStart ?? null,
      periodEnd: sub.periodEnd ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? null,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  },
});

/**
 * getUserPlan — returns merged plan + limits + custom limits for the calling user.
 * This is the reactive endpoint the frontend uses to know plan status.
 */
export const getUserPlan = authQuery({
  args: {},
  handler: async (ctx): Promise<UserLimits> => {
    const { user } = ctx;

    // 1. Fetch subscription (may be null → free).
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();

    // 2. Derive plan from subscription status.
    const plan = deriveEffectivePlan(sub);

    // 3. Fetch user metadata for custom limits.
    const dbUser = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: user.id,
    });
    const metadata = (dbUser as { metadata?: unknown } | null)?.metadata;

    // 4. Compute effective limits.
    const limits = getLimits(plan, metadata);
    const customLimits = parseCustomLimits(metadata);

    // 5. Build subscription summary.
    const subscriptionSummary = sub
      ? {
          id: sub._id as string,
          status: sub.status ?? "unknown",
          provider: sub.provider ?? null,
          appstoreProductId: sub.appstoreProductId ?? null,
          periodEnd: sub.periodEnd ?? null,
        }
      : null;

    return {
      plan,
      limits,
      customLimits,
      subscription: subscriptionSummary,
    };
  },
});
