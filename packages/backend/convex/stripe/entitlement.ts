import type Stripe from "stripe";

export type StripeSubscriptionState = {
  plan: "free" | "pro";
  status: string;
  periodStart: number;
  periodEnd: number;
  cancelAtPeriodEnd: boolean;
};

const toMs = (seconds: number) => seconds * 1000;

export function normalizeStripePlan(plan: string | undefined): "free" | "pro" {
  if (plan === undefined || plan === "pro") return "pro";
  return "free";
}

function isReversed(invoice: Stripe.Invoice): boolean {
  const charge = invoice.charge;
  if (charge && typeof charge !== "string") {
    if (charge.refunded || charge.disputed) return true;
  }
  return (
    invoice.post_payment_credit_notes_amount > 0 &&
    invoice.post_payment_credit_notes_amount >= invoice.amount_paid
  );
}

/**
 * The period bought by the latest invoice when that invoice was paid after
 * Stripe had already canceled the subscription. Payment before cancellation
 * (e.g. an admin's immediate cancel) does not extend access.
 */
export function getPaidPeriodAfterCancellation(
  subscription: Stripe.Subscription,
): { start: number; end: number } | null {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") return null;
  if (invoice.status !== "paid" || invoice.amount_paid <= 0) return null;

  const paidAt = invoice.status_transitions.paid_at;
  const canceledAt = subscription.canceled_at;
  if (!paidAt || !canceledAt || paidAt < canceledAt) return null;
  if (isReversed(invoice)) return null;

  const periods = invoice.lines.data
    .filter((line) => line.type === "subscription" && !line.proration)
    .map((line) => line.period);
  if (periods.length === 0) return null;

  return {
    start: toMs(Math.min(...periods.map((period) => period.start))),
    end: toMs(Math.max(...periods.map((period) => period.end))),
  };
}

/**
 * Map a live Stripe subscription (with `latest_invoice.charge` expanded) to the
 * stored subscription row. Always derive from a fresh retrieve, never from a
 * webhook snapshot, so replayed or out-of-order events converge.
 */
export function deriveStripeSubscriptionState(
  subscription: Stripe.Subscription,
  now: number = Date.now(),
): StripeSubscriptionState {
  if (subscription.status !== "canceled") {
    return {
      plan: normalizeStripePlan(subscription.metadata?.plan),
      status: subscription.status,
      periodStart: toMs(subscription.current_period_start),
      periodEnd: toMs(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  const paidPeriod = getPaidPeriodAfterCancellation(subscription);
  if (paidPeriod && paidPeriod.end > now) {
    return {
      plan: "pro",
      status: "canceled",
      periodStart: paidPeriod.start,
      periodEnd: paidPeriod.end,
      cancelAtPeriodEnd: true,
    };
  }

  const endedAt =
    subscription.ended_at ?? subscription.canceled_at ?? now / 1000;
  return {
    plan: "free",
    status: "canceled",
    periodStart: toMs(subscription.current_period_start),
    periodEnd: toMs(endedAt),
    cancelAtPeriodEnd: false,
  };
}
