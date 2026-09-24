/**
 * subscriptions/mutations.ts — Internal webhook-driven subscription writes.
 * Default runtime (no "use node").
 *
 * Webhook writes are idempotent and called from stripe/actions.ts.
 */

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  deriveEffectivePlan,
  isLifetimeSubscription,
  isPaidStripePeriod,
  type SubscriptionPlanState,
} from "../billing/plans";
import { startPlanSync } from "../integrations/workflows";
import { grantLifetimeProForUser } from "./lifetime";

const planValidator = v.union(v.literal("free"), v.literal("pro"));

/**
 * Reset "Limit exceeded" bookmarks once per Free→Pro transition. Scheduling
 * here, inside the transaction, keeps concurrent webhooks for the same upgrade
 * from retrying twice.
 */
async function retryBookmarksOnActivation(
  ctx: MutationCtx,
  userId: string,
  before: SubscriptionPlanState | null,
  after: SubscriptionPlanState,
) {
  if (deriveEffectivePlan(before) === "pro") return;
  if (deriveEffectivePlan(after) !== "pro") return;
  await ctx.scheduler.runAfter(
    0,
    internal.stripe.actions.retryLimitExceededBookmarks,
    { userId },
  );
}

/**
 * upsertFromWebhook — find subscription by userId (by_user index); update if
 * exists, insert if not. Called from checkout.session.completed.
 * Idempotent by userId.
 */
export const upsertFromWebhook = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    plan: planValidator,
    status: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (isLifetimeSubscription(existing)) {
      return null;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: args.plan,
        provider: "stripe",
        status: args.status,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        appstoreOriginalTransactionId: undefined,
        appstoreProductId: undefined,
        appstoreLastVerifiedAt: undefined,
        ...(args.stripeCustomerId !== undefined
          ? { stripeCustomerId: args.stripeCustomerId }
          : {}),
        ...(args.stripeSubscriptionId !== undefined
          ? { stripeSubscriptionId: args.stripeSubscriptionId }
          : {}),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: args.plan,
        provider: "stripe",
        status: args.status,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        appstoreOriginalTransactionId: undefined,
        appstoreProductId: undefined,
        appstoreLastVerifiedAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    await retryBookmarksOnActivation(ctx, args.userId, existing, {
      ...args,
      provider: "stripe",
    });
    return null;
  },
});

/**
 * updateFromWebhook — find subscription by stripeSubscriptionId
 * (by_stripe_subscription index); update the found row.
 * Called from stripe/actions.ts syncStripeSubscription with state derived from
 * a fresh Stripe retrieve.
 * No-op if subscription not found (log only).
 */
export const updateFromWebhook = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    plan: planValidator,
    status: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    if (!existing) {
      console.warn(
        "[subscriptions.updateFromWebhook] subscription not found",
        args.stripeSubscriptionId,
      );
      return null;
    }

    if (isLifetimeSubscription(existing)) {
      return existing.userId;
    }

    const next = {
      plan: args.plan,
      provider: "stripe" as const,
      status: args.status,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    };
    await ctx.db.patch(existing._id, {
      ...next,
      appstoreOriginalTransactionId: undefined,
      appstoreProductId: undefined,
      appstoreLastVerifiedAt: undefined,
      updatedAt: Date.now(),
    });

    const alreadyScheduled =
      isPaidStripePeriod(existing) && existing.periodEnd === args.periodEnd;
    if (isPaidStripePeriod(next) && !alreadyScheduled) {
      await ctx.scheduler.runAt(
        args.periodEnd,
        internal.subscriptions.mutations.expirePaidStripePeriod,
        { subscriptionId: existing._id },
      );
    }

    await retryBookmarksOnActivation(ctx, existing.userId, existing, next);
    return existing.userId;
  },
});

/**
 * Flip a canceled Stripe row whose paid period is over back to free and
 * resync the marketing plan. Entitlement already ends at `periodEnd` through
 * `deriveEffectivePlan`; this keeps the stored row and Lumail in step.
 * No-op if the row was resubscribed or re-synced in the meantime.
 */
export const expirePaidStripePeriod = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const subscription = await ctx.db.get(subscriptionId);
    if (
      !subscription ||
      subscription.provider !== "stripe" ||
      subscription.status !== "canceled" ||
      subscription.plan !== "pro" ||
      isPaidStripePeriod(subscription)
    ) {
      return null;
    }

    await ctx.db.patch(subscriptionId, {
      plan: "free",
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });
    await startPlanSync(ctx, { userId: subscription.userId });
    return null;
  },
});

/** Grant permanent Pro access without creating a billing-provider identity. */
export const grantLifetimeProByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.runQuery(components.betterAuth.data.getUserByEmail, {
      email,
    });

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    const granted = await grantLifetimeProForUser(ctx, user._id as string);
    return { email, ...granted };
  },
});
