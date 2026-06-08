import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { getServerUrl } from "@/lib/server-url";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database/client";

export async function createUpgradeCheckoutSession(params: {
  userId: string;
  plan: string;
  annual: boolean;
  successUrl: string;
  cancelUrl: string;
}) {
  const authPlan = AUTH_PLANS.find((plan) => plan.name === params.plan);
  if (!authPlan) {
    throw new Error(`Plan "${params.plan}" not found`);
  }

  const priceId = params.annual
    ? authPlan.annualDiscountPriceId
    : authPlan.priceId;
  if (!priceId) {
    throw new Error(`Price ID not found for plan "${params.plan}"`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { stripeCustomerId: true },
  });

  if (!dbUser?.stripeCustomerId) {
    throw new Error("No Stripe customer ID found");
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
    success_url: `${getServerUrl()}${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getServerUrl()}${params.cancelUrl}`,
    allow_promotion_codes: true,
    metadata: {
      userId: params.userId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
      },
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

