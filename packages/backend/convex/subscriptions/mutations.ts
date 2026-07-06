/**
 * subscriptions/mutations.ts — Internal webhook-driven subscription writes.
 * Default runtime (no "use node").
 *
 * Both mutations are idempotent and called exclusively from stripe/actions.ts
 * processWebhook handler.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

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
    plan: v.string(),
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

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: args.plan,
        provider: "stripe",
        status: args.status,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        revenuecatProductId: undefined,
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
        revenuecatProductId: undefined,
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
    plan: v.string(),
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

    await ctx.db.patch(existing._id, {
      plan: args.plan,
      provider: "stripe",
      status: args.status,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      revenuecatProductId: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});
