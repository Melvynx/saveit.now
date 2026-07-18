const STRIPE_IDEMPOTENCY_KEY_MAX_LENGTH = 255;

function buildStripeIdempotencyKey(parts: readonly string[]): string {
  const key = ["saveit", ...parts].join(":");
  if (key.length > STRIPE_IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new Error("Stripe idempotency key exceeds 255 characters");
  }
  return key;
}

/** Stable for every attempt to create the one Stripe customer for a user. */
export function stripeCustomerIdempotencyKey(userId: string): string {
  return buildStripeIdempotencyKey(["customer", "v1", userId]);
}

/**
 * One Checkout intent per user and attempt generation. The previous Checkout
 * Session, not the requested price, advances the generation so monthly and
 * annual requests racing in the same generation share one Stripe key.
 */
export function stripeCheckoutIntentIdempotencyKey(
  userId: string,
  previousSessionId: string | null,
): string {
  return buildStripeIdempotencyKey([
    "checkout-intent",
    "v2",
    userId,
    previousSessionId ?? "initial",
  ]);
}
