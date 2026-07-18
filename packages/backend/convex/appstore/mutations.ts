import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { deriveEffectivePlan } from "../billing/plans";
import { throwValidationError } from "../utils/errors";

type Subscription = Doc<"subscriptions">;
type AppleStatus = 1 | 2 | 3 | 4 | 5;

const appleStatusValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
);

function hasActiveStripeSubscription(subscription: Subscription | null) {
  return (
    subscription !== null &&
    subscription.provider !== "appstore" &&
    Boolean(subscription.stripeSubscriptionId) &&
    (subscription.status === "active" || subscription.status === "trialing")
  );
}

function wasEntitled(subscription: Subscription | null) {
  return deriveEffectivePlan(subscription) === "pro";
}

function derivePatch(
  appleStatus: AppleStatus,
  expiresDateMs: number,
  autoRenew: boolean,
) {
  const now = Date.now();
  const effectiveStatus =
    appleStatus === 1 && expiresDateMs <= now ? 2 : appleStatus;

  if (effectiveStatus === 1) {
    return {
      plan: "pro" as const,
      status: "active",
      cancelAtPeriodEnd: !autoRenew,
    };
  }

  if (effectiveStatus === 3) {
    return {
      plan: "free" as const,
      status: "billing_retry",
      cancelAtPeriodEnd: false,
    };
  }

  if (effectiveStatus === 4) {
    return {
      plan: "pro" as const,
      status: "past_due",
      cancelAtPeriodEnd: false,
    };
  }

  return {
    plan: "free" as const,
    status: "canceled",
    cancelAtPeriodEnd: false,
  };
}

export const upsertFromApple = internalMutation({
  args: {
    userId: v.string(),
    productId: v.string(),
    originalTransactionId: v.string(),
    expiresDateMs: v.number(),
    purchaseDateMs: v.optional(v.number()),
    appleStatus: appleStatusValidator,
    autoRenew: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingByOriginalTransaction = await ctx.db
      .query("subscriptions")
      .withIndex("by_appstore_original_transaction", (q) =>
        q.eq("appstoreOriginalTransactionId", args.originalTransactionId),
      )
      .first();

    if (
      existingByOriginalTransaction &&
      existingByOriginalTransaction.userId !== args.userId
    ) {
      throwValidationError(
        "This App Store subscription belongs to another account.",
      );
    }

    const existingByUser = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const existing = existingByOriginalTransaction ?? existingByUser;

    if (hasActiveStripeSubscription(existing)) {
      console.info(
        "[appstore.upsertFromApple] ignoring App Store state for active Stripe subscription",
        { userId: args.userId },
      );
      return {
        applied: false,
        plan: (existing?.plan === "pro" ? "pro" : "free") as "pro" | "free",
        status: existing?.status ?? null,
      };
    }

    const patch = derivePatch(
      args.appleStatus as AppleStatus,
      args.expiresDateMs,
      args.autoRenew,
    );
    const freshActivation = patch.plan === "pro" && !wasEntitled(existing);
    const periodStart = args.purchaseDateMs ?? existing?.periodStart ?? now;

    const subscriptionPatch = {
      ...patch,
      provider: "appstore" as const,
      appstoreOriginalTransactionId: args.originalTransactionId,
      appstoreProductId: args.productId,
      appstoreLastVerifiedAt: now,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      periodStart,
      periodEnd: args.expiresDateMs,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, subscriptionPatch);
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        ...subscriptionPatch,
        createdAt: now,
      });
    }

    if (freshActivation) {
      await ctx.scheduler.runAfter(
        0,
        internal.stripe.actions.retryLimitExceededBookmarks,
        { userId: args.userId },
      );
    }

    return {
      applied: true,
      plan: patch.plan,
      status: patch.status,
      cancelAtPeriodEnd: patch.cancelAtPeriodEnd,
    };
  },
});
