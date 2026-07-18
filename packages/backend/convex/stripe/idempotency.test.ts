import { describe, expect, it } from "vitest";
import {
  stripeCheckoutIntentIdempotencyKey,
  stripeCustomerIdempotencyKey,
} from "./idempotency";

describe("Stripe idempotency keys", () => {
  it("is stable for repeated customer creation attempts", () => {
    expect(stripeCustomerIdempotencyKey("user_123")).toBe(
      stripeCustomerIdempotencyKey("user_123"),
    );
  });

  it("isolates customers", () => {
    expect(stripeCustomerIdempotencyKey("user_123")).not.toBe(
      stripeCustomerIdempotencyKey("user_456"),
    );
  });

  it("uses one initial Checkout intent key across monthly and annual races", () => {
    const monthlyRequestKey = stripeCheckoutIntentIdempotencyKey(
      "user_123",
      null,
    );
    const annualRequestKey = stripeCheckoutIntentIdempotencyKey(
      "user_123",
      null,
    );

    expect(monthlyRequestKey).toBe(annualRequestKey);
  });

  it("advances the Checkout intent only after a previous session exists", () => {
    const initialKey = stripeCheckoutIntentIdempotencyKey("user_123", null);
    const retryKey = stripeCheckoutIntentIdempotencyKey(
      "user_123",
      "cs_previous",
    );

    expect(retryKey).not.toBe(initialKey);
    expect(retryKey).toBe(
      stripeCheckoutIntentIdempotencyKey("user_123", "cs_previous"),
    );
  });

  it("refuses keys Stripe would reject", () => {
    expect(() => stripeCustomerIdempotencyKey("x".repeat(256))).toThrow(
      "exceeds 255 characters",
    );
  });
});
