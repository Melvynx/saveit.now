/**
 * billing/limits.ts — Limit enforcement helpers.
 * Default runtime (no "use node").
 *
 * Plain async helpers called from mutations/actions. No Convex function
 * registrations. All ctx reads go through indexes (.withIndex) — never
 * unbounded .collect().
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../functions";
import { throwLimitReached } from "../utils/errors";
import { getLimits, isActiveSubscriptionStatus, PLANS } from "./plans";

/**
 * startOfMonth — UTC start-of-month in milliseconds.
 * Month boundary: first millisecond of the current UTC calendar month.
 */
export function startOfMonth(): number {
  return Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
}

type LimitCtx = MutationCtx;

/**
 * assertCanCreateBookmark — checks total bookmark count + monthly runs.
 * Throws throwLimitReached when over limit.
 * Called from bookmarks/mutations.ts create (and quickSave).
 */
export async function assertCanCreateBookmark(
  ctx: LimitCtx,
  userId: string,
): Promise<void> {
  // 1. Get user metadata for custom limits.
  const user = await ctx.runQuery(
    components.betterAuth.data.getUserById,
    { userId },
  );
  const metadata = (user as { metadata?: unknown } | null)?.metadata;

  // 2. Get active subscription for this user.
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  // 3. Derive plan.
  const plan =
    subscription &&
    isActiveSubscriptionStatus(subscription.status, subscription.provider)
      ? "pro"
      : "free";

  // 4. Compute effective limits (custom overrides plan defaults).
  const limits = getLimits(plan as "free" | "pro", metadata);

  // 5. Get denormalized bookmark count.
  const counters = await ctx.db
    .query("userCounters")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const bookmarkCount = counters?.bookmarkCount ?? 0;

  if (bookmarkCount >= limits.bookmarks) {
    throwLimitReached(
      "You have reached the maximum number of bookmarks",
    );
  }

  // 6. Count monthly processing runs.
  const monthStart = startOfMonth();
  const runsPage = await ctx.db
    .query("bookmarkProcessingRuns")
    .withIndex("by_user_started", (q) =>
      q.eq("userId", userId).gte("startedAt", monthStart),
    )
    .take(limits.monthlyBookmarkRuns + 1);

  const monthlyRuns = runsPage.length;

  if (monthlyRuns >= limits.monthlyBookmarkRuns) {
    throwLimitReached(
      "You have reached the maximum number of bookmark processing runs for this month",
    );
  }
}

/**
 * assertCanRunProcessing — checks only monthly processing runs.
 * Called from bookmarks/mutations.ts reprocess and update (status:PENDING).
 */
export async function assertCanRunProcessing(
  ctx: LimitCtx,
  userId: string,
): Promise<void> {
  // 1. Get user metadata + subscription for limit computation.
  const user = await ctx.runQuery(
    components.betterAuth.data.getUserById,
    { userId },
  );
  const metadata = (user as { metadata?: unknown } | null)?.metadata;

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const plan =
    subscription &&
    isActiveSubscriptionStatus(subscription.status, subscription.provider)
      ? "pro"
      : "free";

  const limits = getLimits(plan as "free" | "pro", metadata);

  // 2. Count monthly runs.
  const monthStart = startOfMonth();
  const runsPage = await ctx.db
    .query("bookmarkProcessingRuns")
    .withIndex("by_user_started", (q) =>
      q.eq("userId", userId).gte("startedAt", monthStart),
    )
    .take(limits.monthlyBookmarkRuns + 1);

  if (runsPage.length >= limits.monthlyBookmarkRuns) {
    throwLimitReached(
      "You have reached the maximum number of bookmark processing runs for this month",
    );
  }
}

/**
 * assertCanRunProcessingMutation — registered internalMutation wrapper
 * around assertCanRunProcessing so it can be called from an internalAction
 * via ctx.runMutation.
 */
export const assertCanRunProcessingMutation = internalMutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await assertCanRunProcessing(ctx, userId);
    return null;
  },
});

/**
 * shouldSendLimitEmail — returns true when the user is approaching the free
 * tier bookmark limit and the limit email hasn't been sent yet.
 *
 * Conditions (all must be true):
 * - plan === "free"
 * - No custom bookmark limit override (i.e., limit equals the default free limit)
 * - bookmarkCount >= limits.bookmarks - 1
 * - !metadata.limitEmailSentAt
 */
export async function shouldSendLimitEmail(
  ctx: LimitCtx,
  userId: string,
): Promise<boolean> {
  // 1. Get user metadata.
  const user = await ctx.runQuery(
    components.betterAuth.data.getUserById,
    { userId },
  );
  const metadata = (user as { metadata?: unknown } | null)?.metadata as
    | Record<string, unknown>
    | null
    | undefined;

  // 2. Check subscription status.
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  // Only applies to free plan users.
  if (
    subscription &&
    isActiveSubscriptionStatus(subscription.status, subscription.provider)
  ) {
    return false;
  }

  const limits = getLimits("free", metadata);

  // Only applies when no custom limit override exists.
  if (limits.bookmarks !== PLANS.free.bookmarks) {
    return false;
  }

  // Check if email was already sent.
  if (metadata?.limitEmailSentAt) {
    return false;
  }

  // Check bookmark count.
  const counters = await ctx.db
    .query("userCounters")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const bookmarkCount = counters?.bookmarkCount ?? 0;

  return bookmarkCount >= limits.bookmarks - 1;
}
