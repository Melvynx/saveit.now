"use node";

import Stripe from "stripe";
import { throwConfigurationError } from "../utils/errors";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  });
}

function generatePromoCode(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } =
    require("node:crypto") as typeof import("node:crypto");
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(12);
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += charset[bytes[index]! % charset.length];
  }
  return code;
}

export async function createLimitPromotionCode(input: {
  offerId: string;
  stripeCustomerId?: string;
}): Promise<string> {
  const couponId = process.env.STRIPE_COUPON_ID;
  if (!couponId) throwConfigurationError("STRIPE_COUPON_ID is not set");

  const promoCode = await getStripe().promotionCodes.create(
    {
      coupon: couponId,
      code: generatePromoCode(),
      max_redemptions: 1,
      expires_at: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
      ...(input.stripeCustomerId ? { customer: input.stripeCustomerId } : {}),
      active: true,
      restrictions: { first_time_transaction: true },
    },
    { idempotencyKey: `saveit-limit-offer:${input.offerId}` },
  );

  return promoCode.code;
}
