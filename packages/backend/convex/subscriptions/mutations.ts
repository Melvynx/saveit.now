/**
 * subscriptions/mutations.ts — Internal webhook-driven subscription writes.
 * Default runtime (no "use node").
 *
 * Both mutations are idempotent and called exclusively from stripe/actions.ts
 * processWebhook handler.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { isLifetimeSubscription } from "../billing/plans";

const planValidator = v.union(v.literal("free"), v.literal("pro"));

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

    return null;
  },
});

/**
 * updateFromWebhook — find subscription by stripeSubscriptionId
 * (by_stripe_subscription index); update the found row.
 * Called from customer.subscription.updated and customer.subscription.deleted.
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
      updatedAt: Date.now(),
    });

    return existing.userId;
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

    const userId = user._id as string;
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const lifetimeAccess = {
      plan: "pro" as const,
      provider: "manual" as const,
      status: "lifetime",
      periodStart: now,
      periodEnd: undefined,
      cancelAtPeriodEnd: false,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      appstoreOriginalTransactionId: undefined,
      appstoreProductId: undefined,
      appstoreLastVerifiedAt: undefined,
      updatedAt: now,
    };

    const subscriptionId = existing
      ? (await ctx.db.patch(existing._id, lifetimeAccess), existing._id)
      : await ctx.db.insert("subscriptions", {
          userId,
          ...lifetimeAccess,
          createdAt: now,
        });

    return {
      email,
      userId,
      subscriptionId,
      plan: "pro" as const,
      provider: "manual" as const,
      status: "lifetime" as const,
    };
  },
});
