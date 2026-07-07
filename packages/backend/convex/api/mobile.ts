"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { components, internal } from "../_generated/api";
import { authAction } from "../functions";
import { throwConfigurationError } from "../utils/errors";

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
    const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      throwConfigurationError(
        "STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_PRO_YEARLY_PRICE_ID is not set",
      );
    }

    const userId = ctx.user.id;
    let stripeCustomerId = ctx.user.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      await ctx.runAction(internal.stripe.actions.ensureCustomer, { userId });
      const refreshed = await ctx.runQuery(
        components.betterAuth.data.getUserById,
        { userId },
      );
      stripeCustomerId = refreshed?.stripeCustomerId ?? null;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId ?? undefined,
      customer_email: stripeCustomerId ? undefined : ctx.user.email,
      mode: "subscription",
      line_items: [
        {
          price: args.annual ? yearlyPriceId : monthlyPriceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        userId,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          userId,
          plan: "pro",
        },
      },
    });

    if (!session.url) {
      throwConfigurationError("Stripe did not return a checkout URL");
    }

    return { checkoutUrl: session.url };
  },
});
