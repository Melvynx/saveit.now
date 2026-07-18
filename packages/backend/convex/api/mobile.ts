"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { components, internal } from "../_generated/api";
import { authAction } from "../functions";
import { throwConfigurationError, throwValidationError } from "../utils/errors";
import { createOrReuseProCheckoutSession } from "../stripe/checkout";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  });
}

export const createCheckout = authAction({
  args: {
    annual: v.optional(v.boolean()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ checkoutUrl: string }> => {
    const userId = ctx.user.id;
    const effectivePlan: "free" | "pro" = await ctx.runQuery(
      internal.subscriptions.helpers.getEffectivePlanForUser,
      { userId },
    );
    if (effectivePlan === "pro") {
      throwValidationError("Your Pro plan is already active");
    }

    const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      throwConfigurationError(
        "STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_PRO_YEARLY_PRICE_ID is not set",
      );
    }

    let stripeCustomerId = ctx.user.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      await ctx.runAction(internal.stripe.actions.ensureCustomer, { userId });
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

    const stripe = getStripe();
    const priceId = args.annual ? yearlyPriceId : monthlyPriceId;
    const session = await createOrReuseProCheckoutSession({
      stripe,
      stripeCustomerId,
      userId,
      priceId,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
    });
    return { checkoutUrl: session.url };
  },
});
