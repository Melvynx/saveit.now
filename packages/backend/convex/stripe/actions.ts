"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { authAction } from "../functions";
import { throwConfigurationError, throwValidationError } from "../utils/errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, {
    // Cast because the SDK uses a strict string-literal union for apiVersion.
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  });
}

const getSiteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

/**
 * Generates a 6-character uppercase alphanumeric promo code using Node crypto.
 * Equivalent to nanoid(6).toUpperCase() with A-Z0-9 charset.
 */
function generatePromoCode(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
  const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(12);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[bytes[i]! % CHARSET.length];
  }
  return code;
}

// ---------------------------------------------------------------------------
// ensureCustomer (internalAction)
//
// Idempotent: if the user already has a stripeCustomerId, returns immediately.
// Otherwise creates a Stripe customer and patches the betterAuth user row.
// Called from auth/hooks.ts → onUserCreated.
// ---------------------------------------------------------------------------

export const ensureCustomer = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });

    if (!user) {
      console.warn("[stripe.ensureCustomer] user not found", userId);
      return null;
    }

    if (user.stripeCustomerId) {
      // Already has a Stripe customer — nothing to do.
      return null;
    }

    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId },
    });

    await ctx.runMutation(components.betterAuth.data.patchUser, {
      userId,
      update: { stripeCustomerId: customer.id },
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// cancelAllForUser (internalAction)
//
// Looks up stripeCustomerId from the betterAuth user row (fixes the original
// bug that passed user.id to customers.retrieve), lists all Stripe subscriptions
// for that customer, and cancels each one. Errors are swallowed so that account
// deletion is never blocked. Called from auth/config.ts → beforeDelete.
// ---------------------------------------------------------------------------

export const cancelAllForUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // IMPORTANT: read stripeCustomerId from user row, NOT user.id (bug fix).
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });

    if (!user?.stripeCustomerId) {
      // No Stripe customer recorded; skip gracefully.
      return null;
    }

    const stripe = getStripe();

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 20,
      });

      await Promise.allSettled(
        subscriptions.data.map((sub) =>
          stripe.subscriptions.cancel(sub.id).catch((err) => {
            console.warn(
              "[stripe.cancelAllForUser] failed to cancel sub",
              sub.id,
              err,
            );
          }),
        ),
      );
    } catch (err) {
      console.warn(
        "[stripe.cancelAllForUser] error listing/canceling subscriptions",
        err,
      );
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// createCheckout (authAction)
//
// Creates a Stripe Checkout Session for upgrading to a plan.
// If the user has no stripeCustomerId, calls ensureCustomer first (idempotent).
// Returns { url } for client-side redirect to Stripe Checkout.
// ---------------------------------------------------------------------------

export const createCheckout = authAction({
  args: {
    plan: v.string(),
    annual: v.boolean(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      throwConfigurationError(
        "STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_PRO_YEARLY_PRICE_ID is not set",
      );
    }

    if (args.plan !== "pro") {
      throwValidationError(`Unknown plan: ${args.plan}`);
    }

    const priceId = args.annual ? yearlyPriceId : monthlyPriceId;

    // Ensure we have a stripeCustomerId (idempotent).
    let stripeCustomerId = ctx.user.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      await ctx.runAction(internal.stripe.actions.ensureCustomer, { userId });
      // Re-fetch to get the newly-written stripeCustomerId.
      const refreshed = await ctx.runQuery(
        components.betterAuth.data.getUserById,
        { userId },
      );
      stripeCustomerId = refreshed?.stripeCustomerId ?? null;
    }

    if (!stripeCustomerId) {
      throwConfigurationError(
        "Could not obtain a Stripe customer ID for this user",
      );
    }

    const siteUrl = getSiteUrl();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${siteUrl}${args.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${args.cancelUrl}`,
      allow_promotion_codes: true,
      metadata: { userId, plan: args.plan },
      subscription_data: {
        metadata: { userId, plan: args.plan },
      },
    });

    if (!session.url) {
      throwConfigurationError("Stripe did not return a checkout URL");
    }

    return { url: session.url };
  },
});

// ---------------------------------------------------------------------------
// createBillingPortal (authAction)
//
// Creates a Stripe Billing Portal session for the calling user.
// Returns { url } for a client-side redirect.
// ---------------------------------------------------------------------------

export const createBillingPortal = authAction({
  args: {},
  handler: async (ctx) => {
    const stripeCustomerId = ctx.user.stripeCustomerId;

    if (!stripeCustomerId) {
      throwValidationError(
        "No billing account found. Please contact support.",
      );
    }

    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getSiteUrl()}/app`,
    });

    return { url: session.url };
  },
});

// ---------------------------------------------------------------------------
// processWebhook (internalAction)
//
// Verifies the Stripe webhook signature (requires the raw body text) and
// dispatches to sub-handlers per event type.
// Returns { ok: boolean, error?: string } — the httpAction in http.ts uses
// this to decide the response status code.
// ---------------------------------------------------------------------------

export const processWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, { body, signature }) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[stripe.processWebhook] STRIPE_WEBHOOK_SECRET not set");
      return { ok: false, error: "Webhook secret not configured" };
    }

    const stripe = getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        "[stripe.processWebhook] signature verification failed",
        msg,
      );
      return { ok: false, error: `Invalid signature: ${msg}` };
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(
            ctx,
            stripe,
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            ctx,
            event.data.object as Stripe.Subscription,
          );
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            ctx,
            event.data.object as Stripe.Subscription,
          );
          break;

        default:
          // Unhandled event type — acknowledge without processing.
          break;
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        "[stripe.processWebhook] handler error for",
        event.type,
        msg,
      );
      return { ok: false, error: msg };
    }
  },
});

// ---------------------------------------------------------------------------
// createPromotionCode (internalAction)
//
// Creates a single-use Stripe promo code backed by STRIPE_COUPON_ID with:
// - 6-char uppercase alphanumeric code
// - max_redemptions: 1
// - expires in 3 days (Unix seconds)
// - first_time_transaction restriction
// Called from marketing/limitReached.ts.
// ---------------------------------------------------------------------------

export const createPromotionCode = internalAction({
  args: {
    userId: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    const couponId = process.env.STRIPE_COUPON_ID;
    if (!couponId) throwConfigurationError("STRIPE_COUPON_ID is not set");

    // Resolve stripeCustomerId if not passed directly.
    let customerId = stripeCustomerId;
    if (!customerId) {
      const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
        userId,
      });
      customerId = user?.stripeCustomerId ?? undefined;
    }

    const stripe = getStripe();
    const code = generatePromoCode();
    // expires_at is Unix seconds (not ms) — 3 days from now.
    const expiresAt = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;

    const promoCode = await stripe.promotionCodes.create({
      coupon: couponId,
      code,
      max_redemptions: 1,
      expires_at: expiresAt,
      ...(customerId ? { customer: customerId } : {}),
      active: true,
      restrictions: { first_time_transaction: true },
    });

    return { code: promoCode.code };
  },
});

// ---------------------------------------------------------------------------
// retryLimitExceededBookmarks (internalAction)
//
// Finds ERROR bookmarks for a user whose processingError contains
// "Limit exceeded", resets them to PENDING, and schedules reprocessing.
// Called from handleSubscriptionUpdated when a user upgrades from free to pro.
//
// Cross-module deps (Contract §B):
//   - internal.bookmarks.mutations.updateProcessing  ({ id, patch }) — Phase 02
//   - internal.processing.pipeline.run              ({ bookmarkId, userId }) — Phase 03
// ---------------------------------------------------------------------------

export const retryLimitExceededBookmarks = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Fetch up to 200 ERROR bookmarks for this user.
    // Uses internal.bookmarks.queries.listErrorBookmarks (Phase 02 provides this).
    // We call it defensively: if it doesn't exist yet, degrade gracefully.
    let errorBookmarks: Array<{ _id: string; processingError?: string | null }> = [];

    try {
      errorBookmarks = await ctx.runQuery(
        internal.bookmarks.queries.listErrorBookmarks,
        { userId },
      );
    } catch (err) {
      console.warn(
        "[stripe.retryLimitExceededBookmarks] listErrorBookmarks not available yet",
        err,
      );
      return;
    }

    // Filter in JS: only bookmarks whose processingError contains "Limit exceeded".
    const limitBookmarks = errorBookmarks.filter((b) =>
      b.processingError?.includes("Limit exceeded"),
    );

    for (const bookmark of limitBookmarks) {
      try {
        // Reset status to PENDING.
        await ctx.runMutation(
          internal.bookmarks.mutations.updateProcessing,
          {
            id: bookmark._id as never,
            patch: {
              status: "PENDING",
              processingStep: 0,
              processingError: null,
            },
          },
        );
        // Schedule reprocessing via the pipeline.
        await ctx.scheduler.runAfter(0, internal.processing.pipeline.run, {
          bookmarkId: bookmark._id as never,
          userId,
        });
      } catch (err) {
        console.warn(
          "[stripe.retryLimitExceededBookmarks] failed to reset bookmark",
          bookmark._id,
          err,
        );
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Private sub-handlers — plain async functions, NOT Convex registrations
// ---------------------------------------------------------------------------

type WebhookCtx = ActionCtx;

async function handleCheckoutSessionCompleted(
  ctx: WebhookCtx,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (!session.customer || !session.subscription) {
    console.warn(
      "[stripe] checkout.session.completed: missing customer or subscription",
      session.id,
    );
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer as Stripe.Customer).id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as Stripe.Subscription).id;

  // Resolve userId from session metadata (embedded at checkout creation).
  const metaUserId = session.metadata?.userId;
  if (!metaUserId) {
    console.error(
      "[stripe] checkout.session.completed: no userId in session metadata",
      session.id,
    );
    return;
  }

  const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
    userId: metaUserId,
  });

  if (!user) {
    console.error(
      "[stripe] checkout.session.completed: user not found",
      metaUserId,
    );
    return;
  }

  // Patch stripeCustomerId on user row if not yet set (idempotent).
  if (!user.stripeCustomerId) {
    await ctx.runMutation(components.betterAuth.data.patchUser, {
      userId: user._id as string,
      update: { stripeCustomerId: customerId },
    });
  }

  // Retrieve the full subscription object to get period info.
  const stripeSubscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = stripeSubscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error(
      "[stripe] checkout.session.completed: no priceId on subscription",
      subscriptionId,
    );
    return;
  }

  // Plan name comes from subscription metadata set at checkout session creation.
  const planName =
    (stripeSubscription.metadata?.plan as string | undefined) ?? "pro";

  await ctx.runMutation(internal.subscriptions.mutations.upsertFromWebhook, {
    userId: user._id as string,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan: planName,
    status: stripeSubscription.status,
    periodStart: stripeSubscription.current_period_start * 1000,
    periodEnd: stripeSubscription.current_period_end * 1000,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  });

  // Schedule subscription thank-you drip on first pro activation.
  await ctx.scheduler.runAfter(
    0,
    internal.marketing.subscription.startSubscriptionDrip,
    { userId: user._id as string },
  );
}

async function handleSubscriptionUpdated(
  ctx: WebhookCtx,
  subscription: Stripe.Subscription,
) {
  // Plan name from subscription metadata; fall back to "pro" when absent.
  const planName =
    (subscription.metadata?.plan as string | undefined) ?? "pro";

  await ctx.runMutation(internal.subscriptions.mutations.updateFromWebhook, {
    stripeSubscriptionId: subscription.id,
    plan: planName,
    status: subscription.status,
    periodStart: subscription.current_period_start * 1000,
    periodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Upgrade-from-free retry: reset ERROR bookmarks blocked by "Limit exceeded".
  // userId is in subscription metadata (set during checkout session creation).
  const userId = subscription.metadata?.userId as string | undefined;
  if (userId && subscription.status === "active") {
    await ctx.scheduler.runAfter(
      0,
      internal.stripe.actions.retryLimitExceededBookmarks,
      { userId },
    );
  }
}

async function handleSubscriptionDeleted(
  ctx: WebhookCtx,
  subscription: Stripe.Subscription,
) {
  await ctx.runMutation(internal.subscriptions.mutations.updateFromWebhook, {
    stripeSubscriptionId: subscription.id,
    plan: "free",
    status: "canceled",
    periodStart: subscription.current_period_start * 1000,
    periodEnd: Date.now(),
    cancelAtPeriodEnd: false,
  });
}
