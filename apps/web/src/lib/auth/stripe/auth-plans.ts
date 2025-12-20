import type { Subscription } from "@workspace/database";
import { AUTH_LIMITS, type AuthLimits } from "../../auth-limits";
import { inngest } from "../../inngest/client";
import { logger } from "../../logger";

type HookCtx = {
  req: Request;
  userId: string;
  stripeCustomerId: string;
  subscriptionId: string;
};

export type AppAuthPlan = {
  name: string;
  priceId?: string;
  annualDiscountPriceId?: string;
  limits: AuthLimits;
  onSubscriptionComplete?: (
    subscription: Subscription,
    ctx: HookCtx,
  ) => Promise<void>;
  onSubscriptionCanceled?: (
    subscription: Subscription,
    ctx: HookCtx,
  ) => Promise<void>;
};

export const AUTH_PLANS: AppAuthPlan[] = [
  {
    name: "free",
    limits: AUTH_LIMITS.free,
  },
  {
    name: "pro",
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    limits: AUTH_LIMITS.pro,
    onSubscriptionComplete: async (subscription, ctx) => {
      logger.info("🎉 Subscription completed", {
        subscriptionId: subscription.id,
        userId: ctx.userId,
        plan: subscription.plan,
      });
      inngest.send({
        name: "user/subscription",
        data: {
          userId: ctx.userId,
        },
      });
    },
  },
];

export const getPlanByName = (name: string): AppAuthPlan | undefined => {
  return AUTH_PLANS.find((p) => p.name === name);
};

export const getPlanByPriceId = (priceId: string): AppAuthPlan | undefined => {
  return AUTH_PLANS.find(
    (p) => p.priceId === priceId || p.annualDiscountPriceId === priceId,
  );
};
