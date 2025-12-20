"use server";

import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { SafeActionError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { getServerUrl } from "@/lib/server-url";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const upgradeSubscriptionAction = userAction
  .schema(
    z.object({
      plan: z.string(),
      annual: z.boolean().default(false),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
  )
  .action(
    async ({
      parsedInput: { plan, annual, successUrl, cancelUrl },
      ctx: { user },
    }) => {
      const authPlan = AUTH_PLANS.find((p) => p.name === plan);
      if (!authPlan) {
        throw new SafeActionError(`Plan "${plan}" not found`);
      }

      const priceId = annual
        ? authPlan.annualDiscountPriceId
        : authPlan.priceId;
      if (!priceId) {
        throw new SafeActionError(`Price ID not found for plan "${plan}"`);
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      if (!dbUser?.stripeCustomerId) {
        throw new SafeActionError("No Stripe customer ID found");
      }

      const session = await stripeClient.checkout.sessions.create({
        customer: dbUser.stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${getServerUrl()}${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getServerUrl()}${cancelUrl}`,
        allow_promotion_codes: true,
        metadata: {
          userId: user.id,
          plan: plan,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            plan: plan,
          },
        },
      });

      if (!session.url) {
        throw new SafeActionError("Failed to create checkout session");
      }

      return {
        url: session.url,
      };
    },
  );

export const openBillingPortalAction = userAction.action(
  async ({ ctx: { user } }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });

    if (!dbUser?.stripeCustomerId) {
      throw new SafeActionError("No Stripe customer ID found");
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${getServerUrl()}/app`,
    });

    if (!session.url) {
      throw new SafeActionError("Failed to create billing portal session");
    }

    return {
      url: session.url,
    };
  },
);
