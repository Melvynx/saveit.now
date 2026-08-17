/**
 * Complimentary lifetime Pro. Inserts a manual lifetime row rather than
 * rewriting a Stripe/App Store identity — those webhooks keep working, and
 * `deriveEffectivePlan` still prefers the Pro-granting row.
 */

import { isLifetimeSubscription } from "../billing/plans";
import type { MutationCtx } from "../_generated/server";

const SUBSCRIPTION_PER_USER_LIMIT = 20;

export function lifetimeProFields(now: number) {
  return {
    plan: "pro" as const,
    provider: "manual" as const,
    status: "lifetime",
    periodStart: now,
    cancelAtPeriodEnd: false,
    updatedAt: now,
  };
}

export async function grantLifetimeProForUser(
  ctx: MutationCtx,
  userId: string,
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(SUBSCRIPTION_PER_USER_LIMIT);

  const lifetime = existing.find((row) => isLifetimeSubscription(row));
  if (lifetime) {
    return {
      userId,
      subscriptionId: lifetime._id,
      alreadyGranted: true as const,
      plan: "pro" as const,
      provider: "manual" as const,
      status: "lifetime" as const,
    };
  }

  const subscriptionId = await ctx.db.insert("subscriptions", {
    userId,
    ...lifetimeProFields(now),
    createdAt: now,
  });

  return {
    userId,
    subscriptionId,
    alreadyGranted: false as const,
    plan: "pro" as const,
    provider: "manual" as const,
    status: "lifetime" as const,
  };
}
