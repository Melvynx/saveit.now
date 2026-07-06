import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { isActiveSubscriptionStatus } from "../billing/plans";

const PRO_ENTITLEMENT_ID = "pro";
const PRO_PRODUCT_IDS = new Set([
  "now.saveit.saveitapp.pro.monthly",
  "now.saveit.saveitapp.pro.yearly",
]);

const ACTIVATION_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

type RevenueCatEvent = Record<string, unknown>;
type Subscription = Doc<"subscriptions">;

function asRecord(value: unknown): RevenueCatEvent | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RevenueCatEvent)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  const record = asRecord(value);
  if (!record) return [];

  return Object.values(record).filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function isAnonymousRevenueCatId(userId: string) {
  return userId.startsWith("$RCAnonymousID:");
}

function getNonAnonymousUserIds(value: unknown) {
  return getStringArray(value).filter((userId) => {
    return !isAnonymousRevenueCatId(userId);
  });
}

function resolveUserId(event: RevenueCatEvent) {
  const appUserId = getString(event.app_user_id);
  if (appUserId && !isAnonymousRevenueCatId(appUserId)) {
    return appUserId;
  }

  return getNonAnonymousUserIds(event.aliases)[0] ?? null;
}

function concernsPro(event: RevenueCatEvent) {
  const entitlementIds = getStringArray(event.entitlement_ids);
  const productId = getString(event.product_id);

  return (
    entitlementIds.includes(PRO_ENTITLEMENT_ID) ||
    (productId !== null && PRO_PRODUCT_IDS.has(productId))
  );
}

function isSandboxEvent(event: RevenueCatEvent) {
  return getString(event.environment)?.toUpperCase() === "SANDBOX";
}

function hasActiveStripeSubscription(subscription: Subscription | null) {
  return (
    subscription !== null &&
    subscription.provider !== "revenuecat" &&
    Boolean(subscription.stripeSubscriptionId) &&
    (subscription.status === "active" || subscription.status === "trialing")
  );
}

function wasEntitled(subscription: Subscription | null) {
  return (
    subscription !== null &&
    subscription.plan === "pro" &&
    isActiveSubscriptionStatus(subscription.status, subscription.provider)
  );
}

function isStaleRevenueCatEvent(
  subscription: Subscription | null,
  eventTimestamp: number | null,
) {
  return (
    subscription !== null &&
    subscription.provider === "revenuecat" &&
    eventTimestamp !== null &&
    subscription.revenuecatLastEventAt !== undefined &&
    subscription.revenuecatLastEventAt >= eventTimestamp
  );
}

async function getSubscription(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

async function upsertRevenueCatSubscription(
  ctx: MutationCtx,
  userId: string,
  event: RevenueCatEvent,
  patch: {
    plan: "free" | "pro";
    status: string;
    periodStart?: number;
    periodEnd?: number;
    cancelAtPeriodEnd: boolean;
  },
  options: { scheduleActivationRetry?: boolean } = {},
) {
  const now = Date.now();
  const existing = await getSubscription(ctx, userId);
  const eventTimestamp = getNumber(event.event_timestamp_ms);

  if (hasActiveStripeSubscription(existing)) {
    console.info(
      "[revenuecat.webhook] ignoring event for active Stripe subscription",
      { userId, eventType: event.type },
    );
    return { applied: false, freshActivation: false };
  }

  if (isStaleRevenueCatEvent(existing, eventTimestamp)) {
    console.info("[revenuecat.webhook] ignoring stale event", {
      userId,
      eventType: event.type,
      eventTimestamp,
      lastEventAt: existing?.revenuecatLastEventAt,
    });
    return { applied: false, freshActivation: false, skipped: "stale_event" };
  }

  const freshActivation =
    options.scheduleActivationRetry === true &&
    patch.plan === "pro" &&
    !wasEntitled(existing);
  const productId = getString(event.product_id) ?? undefined;

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...patch,
      provider: "revenuecat",
      revenuecatProductId: productId,
      ...(eventTimestamp !== null
        ? { revenuecatLastEventAt: eventTimestamp }
        : {}),
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("subscriptions", {
      userId,
      plan: patch.plan,
      provider: "revenuecat",
      revenuecatProductId: productId,
      ...(eventTimestamp !== null
        ? { revenuecatLastEventAt: eventTimestamp }
        : {}),
      status: patch.status,
      periodStart: patch.periodStart,
      periodEnd: patch.periodEnd,
      cancelAtPeriodEnd: patch.cancelAtPeriodEnd,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (freshActivation) {
    await ctx.scheduler.runAfter(
      0,
      internal.stripe.actions.retryLimitExceededBookmarks,
      { userId },
    );
  }

  return { applied: true, freshActivation };
}

async function revokeTransferredFrom(
  ctx: MutationCtx,
  userId: string,
  event: RevenueCatEvent,
) {
  const existing = await getSubscription(ctx, userId);
  const eventTimestamp = getNumber(event.event_timestamp_ms);

  if (hasActiveStripeSubscription(existing)) {
    console.info(
      "[revenuecat.webhook] ignoring transfer revocation for active Stripe subscription",
      { userId, eventType: event.type },
    );
    return { applied: false };
  }

  if (isStaleRevenueCatEvent(existing, eventTimestamp)) {
    console.info("[revenuecat.webhook] ignoring stale transfer revocation", {
      userId,
      eventType: event.type,
      eventTimestamp,
      lastEventAt: existing?.revenuecatLastEventAt,
    });
    return { applied: false, skipped: "stale_event" };
  }

  if (!existing || existing.provider !== "revenuecat") {
    return { applied: false };
  }

  await ctx.db.patch(existing._id, {
    plan: "free",
    status: "canceled",
    cancelAtPeriodEnd: false,
    ...(eventTimestamp !== null
      ? { revenuecatLastEventAt: eventTimestamp }
      : {}),
    updatedAt: Date.now(),
  });

  return { applied: true };
}

async function applyActivation(
  ctx: MutationCtx,
  userId: string,
  event: RevenueCatEvent,
) {
  const now = Date.now();
  const expirationAt = getNumber(event.expiration_at_ms);
  const isExpired = expirationAt !== null && expirationAt <= now;

  return await upsertRevenueCatSubscription(
    ctx,
    userId,
    event,
    {
      plan: isExpired ? "free" : "pro",
      status: isExpired ? "canceled" : "active",
      periodStart: getNumber(event.purchased_at_ms) ?? now,
      periodEnd: expirationAt ?? now,
      cancelAtPeriodEnd: false,
    },
    { scheduleActivationRetry: !isExpired },
  );
}

export const processEvent = internalMutation({
  args: {
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const event = asRecord(args.event);
    if (!event) {
      console.warn("[revenuecat.webhook] invalid event payload");
      return { ok: false, skipped: "invalid_event" };
    }

    const eventType = getString(event.type)?.toUpperCase() ?? "UNKNOWN";

    if (!concernsPro(event)) {
      console.info("[revenuecat.webhook] ignoring non-Pro event", {
        eventType,
        productId: event.product_id,
      });
      return { ok: true, skipped: "non_pro" };
    }

    if (
      isSandboxEvent(event) &&
      process.env.REVENUECAT_ALLOW_SANDBOX !== "true"
    ) {
      console.info("[revenuecat.webhook] ignoring sandbox event", {
        eventType,
      });
      return { ok: true, skipped: "sandbox" };
    }

    if (eventType === "TRANSFER") {
      const transferredToUserIds = getNonAnonymousUserIds(event.transferred_to);
      const transferredFromUserIds = getNonAnonymousUserIds(
        event.transferred_from,
      );

      if (
        transferredToUserIds.length === 0 &&
        transferredFromUserIds.length === 0
      ) {
        console.warn("[revenuecat.webhook] transfer has no resolved user ids", {
          appUserId: event.app_user_id,
        });
        return { ok: true, skipped: "unresolved_transfer" };
      }

      let applied = 0;
      let revoked = 0;
      let staleSkipped = 0;

      for (const userId of transferredFromUserIds) {
        const result = await revokeTransferredFrom(ctx, userId, event);
        if (result.applied) revoked += 1;
        if ("skipped" in result && result.skipped === "stale_event") {
          staleSkipped += 1;
        }
      }

      for (const userId of transferredToUserIds) {
        const result = await applyActivation(ctx, userId, event);
        if (result.applied) applied += 1;
        if ("skipped" in result && result.skipped === "stale_event") {
          staleSkipped += 1;
        }
      }

      return { ok: true, applied, revoked, staleSkipped };
    }

    const userId = resolveUserId(event);
    if (!userId) {
      console.warn("[revenuecat.webhook] no resolved user id", {
        eventType,
        appUserId: event.app_user_id,
        aliases: event.aliases,
      });
      return { ok: true, skipped: "unresolved_user" };
    }

    const existing = await getSubscription(ctx, userId);
    const eventTimestamp = getNumber(event.event_timestamp_ms);
    if (isStaleRevenueCatEvent(existing, eventTimestamp)) {
      console.info("[revenuecat.webhook] ignoring stale event", {
        userId,
        eventType,
        eventTimestamp,
        lastEventAt: existing?.revenuecatLastEventAt,
      });
      return { ok: true, skipped: "stale_event" };
    }

    if (ACTIVATION_EVENT_TYPES.has(eventType)) {
      const result = await applyActivation(ctx, userId, event);
      return { ok: true, ...result };
    }

    const now = Date.now();

    if (eventType === "CANCELLATION") {
      const result = await upsertRevenueCatSubscription(ctx, userId, event, {
        plan: "pro",
        status: "active",
        periodStart: getNumber(event.purchased_at_ms) ?? now,
        periodEnd: getNumber(event.expiration_at_ms) ?? now,
        cancelAtPeriodEnd: true,
      });
      return { ok: true, ...result };
    }

    if (eventType === "EXPIRATION") {
      const result = await upsertRevenueCatSubscription(ctx, userId, event, {
        plan: "free",
        status: "canceled",
        periodStart: getNumber(event.purchased_at_ms) ?? now,
        periodEnd: getNumber(event.expiration_at_ms) ?? now,
        cancelAtPeriodEnd: false,
      });
      return { ok: true, ...result };
    }

    if (eventType === "BILLING_ISSUE") {
      const result = await upsertRevenueCatSubscription(ctx, userId, event, {
        plan: "pro",
        status: "past_due",
        periodStart: getNumber(event.purchased_at_ms) ?? now,
        periodEnd: getNumber(event.expiration_at_ms) ?? now,
        cancelAtPeriodEnd: false,
      });
      return { ok: true, ...result };
    }

    console.info("[revenuecat.webhook] ignoring unknown event type", {
      eventType,
    });
    return { ok: true, skipped: "unknown_type" };
  },
});
