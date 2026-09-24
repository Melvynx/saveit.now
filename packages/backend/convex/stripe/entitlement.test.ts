import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { deriveEffectivePlan } from "../billing/plans";
import { deriveStripeSubscriptionState } from "./entitlement";

const seconds = (iso: string) => Date.parse(iso) / 1000;

const PERIOD_START = seconds("2026-08-27T13:57:40Z");
const PERIOD_END = seconds("2027-08-27T13:57:40Z");
const CANCELED_AT = seconds("2026-09-10T15:00:07Z");
const PAID_AFTER_CANCEL = seconds("2026-09-22T18:38:46Z");
const NOW = Date.parse("2026-09-24T00:00:00Z");

function invoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_renewal",
    status: "paid",
    amount_paid: 3000,
    post_payment_credit_notes_amount: 0,
    status_transitions: { paid_at: PAID_AFTER_CANCEL },
    charge: { id: "ch_1", refunded: false, disputed: false },
    lines: {
      data: [
        {
          type: "subscription",
          proration: false,
          period: { start: PERIOD_START, end: PERIOD_END },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

function subscription(
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription {
  return {
    id: "sub_1",
    status: "canceled",
    metadata: {},
    current_period_start: PERIOD_START,
    current_period_end: PERIOD_END,
    cancel_at_period_end: false,
    canceled_at: CANCELED_AT,
    ended_at: CANCELED_AT,
    latest_invoice: invoice(),
    ...overrides,
  } as unknown as Stripe.Subscription;
}

const asRow = (state: ReturnType<typeof deriveStripeSubscriptionState>) => ({
  ...state,
  provider: "stripe" as const,
});

describe("deriveStripeSubscriptionState", () => {
  it("mirrors a live subscription", () => {
    const state = deriveStripeSubscriptionState(
      subscription({ status: "active", canceled_at: null, ended_at: null }),
      NOW,
    );
    expect(state).toEqual({
      plan: "pro",
      status: "active",
      periodStart: PERIOD_START * 1000,
      periodEnd: PERIOD_END * 1000,
      cancelAtPeriodEnd: false,
    });
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("pro");
  });

  it("keeps Stripe past_due on free", () => {
    const state = deriveStripeSubscriptionState(
      subscription({ status: "past_due", canceled_at: null, ended_at: null }),
      NOW,
    );
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("free");
  });

  it("grants the paid period when the renewal is paid after a dunning cancel", () => {
    const state = deriveStripeSubscriptionState(subscription(), NOW);
    expect(state).toEqual({
      plan: "pro",
      status: "canceled",
      periodStart: PERIOD_START * 1000,
      periodEnd: PERIOD_END * 1000,
      cancelAtPeriodEnd: true,
    });
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("pro");
    expect(deriveEffectivePlan(asRow(state), PERIOD_END * 1000)).toBe("free");
  });

  it("ends access at cancellation while the renewal is still unpaid", () => {
    const state = deriveStripeSubscriptionState(
      subscription({
        latest_invoice: invoice({
          status: "open",
          status_transitions: {
            paid_at: null,
          } as Stripe.Invoice.StatusTransitions,
        }),
      }),
      NOW,
    );
    expect(state).toMatchObject({
      plan: "free",
      status: "canceled",
      periodEnd: CANCELED_AT * 1000,
      cancelAtPeriodEnd: false,
    });
  });

  it("does not extend an immediate cancel of an already-paid period", () => {
    const state = deriveStripeSubscriptionState(
      subscription({
        latest_invoice: invoice({
          status_transitions: {
            paid_at: PERIOD_START,
          } as Stripe.Invoice.StatusTransitions,
        }),
      }),
      NOW,
    );
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("free");
  });

  it.each([
    ["refunded", { charge: { refunded: true, disputed: false } }],
    ["disputed", { charge: { refunded: false, disputed: true } }],
    ["fully credited", { post_payment_credit_notes_amount: 3000 }],
  ])("revokes the paid period when the invoice is %s", (_label, patch) => {
    const state = deriveStripeSubscriptionState(
      subscription({
        latest_invoice: invoice(patch as Partial<Stripe.Invoice>),
      }),
      NOW,
    );
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("free");
  });

  it("keeps the paid period after a partial goodwill credit", () => {
    const state = deriveStripeSubscriptionState(
      subscription({
        latest_invoice: invoice({ post_payment_credit_notes_amount: 500 }),
      }),
      NOW,
    );
    expect(deriveEffectivePlan(asRow(state), NOW)).toBe("pro");
  });

  it("stores free once the paid period is over", () => {
    const state = deriveStripeSubscriptionState(
      subscription(),
      PERIOD_END * 1000 + 1,
    );
    expect(state.plan).toBe("free");
  });

  it("ignores an unexpanded latest invoice", () => {
    const state = deriveStripeSubscriptionState(
      subscription({ latest_invoice: "in_renewal" }),
      NOW,
    );
    expect(state.plan).toBe("free");
  });
});
