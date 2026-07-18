"use node";

import Stripe from "stripe";
import { throwConfigurationError, throwValidationError } from "../utils/errors";
import { stripeCheckoutIntentIdempotencyKey } from "./idempotency";

const RECENT_CHECKOUT_SESSION_LIST_LIMIT = 20;
const OPEN_CHECKOUT_SESSION_PAGE_LIMIT = 100;
const SUBSCRIPTION_LIST_LIMIT = 100;
const CHECKOUT_RECONCILIATION_DELAYS_MS = [0, 100, 250, 500, 1000] as const;

export function isTerminalStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): boolean {
  return status === "canceled" || status === "incomplete_expired";
}

async function assertNoExistingStripeSubscription(
  stripe: Stripe,
  stripeCustomerId: string,
): Promise<void> {
  let startingAfter: string | undefined;
  do {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: SUBSCRIPTION_LIST_LIMIT,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    if (
      subscriptions.data.some(
        (subscription) =>
          !isTerminalStripeSubscriptionStatus(subscription.status),
      )
    ) {
      throwValidationError(
        "A Stripe subscription already exists for this account",
      );
    }
    startingAfter = subscriptions.has_more
      ? subscriptions.data.at(-1)?.id
      : undefined;
  } while (startingAfter);
}

function isSaveItProCheckoutSession(
  session: Stripe.Checkout.Session,
  userId: string,
): boolean {
  return (
    session.mode === "subscription" &&
    session.metadata?.userId === userId &&
    (session.metadata?.plan === undefined || session.metadata.plan === "pro")
  );
}

async function listProCheckoutSessions(
  stripe: Stripe,
  stripeCustomerId: string,
  userId: string,
): Promise<Stripe.Checkout.Session[]> {
  const recentSessionsPromise = stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    limit: RECENT_CHECKOUT_SESSION_LIST_LIMIT,
  });

  const openSessions: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      status: "open",
      limit: OPEN_CHECKOUT_SESSION_PAGE_LIMIT,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    openSessions.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);

  const recentSessions = await recentSessionsPromise;
  const sessionsById = new Map(
    [...recentSessions.data, ...openSessions].map((session) => [
      session.id,
      session,
    ]),
  );
  return [...sessionsById.values()]
    .filter((session) => isSaveItProCheckoutSession(session, userId))
    .sort((left, right) => right.created - left.created);
}

async function getCheckoutSessionPriceId(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const metadataPriceId = session.metadata?.checkoutPriceId;
  if (metadataPriceId) return metadataPriceId;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
  });
  return lineItems.data[0]?.price?.id ?? null;
}

function isStripeIdempotencyConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as {
    code?: unknown;
    message?: unknown;
    type?: unknown;
  };
  const message =
    typeof stripeError.message === "string"
      ? stripeError.message.toLowerCase()
      : "";
  return (
    stripeError.type === "StripeIdempotencyError" ||
    stripeError.code === "idempotency_key_in_use" ||
    message.includes("idempotency key")
  );
}

async function waitForConcurrentCheckoutSession(
  stripe: Stripe,
  stripeCustomerId: string,
  userId: string,
): Promise<Stripe.Checkout.Session | null> {
  for (const delayMs of CHECKOUT_RECONCILIATION_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const sessions = await listProCheckoutSessions(
      stripe,
      stripeCustomerId,
      userId,
    );
    const openSession = sessions.find(
      (session) => session.status === "open" && session.url,
    );
    if (openSession) return openSession;
  }
  return null;
}

export async function createOrReuseProCheckoutSession({
  stripe,
  stripeCustomerId,
  userId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  stripe: Stripe;
  stripeCustomerId: string;
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  // Stripe is the authoritative guard during the webhook-lag window. This is
  // deliberately before open-session reuse so an older active subscription
  // cannot be hidden by a newer Checkout Session.
  await assertNoExistingStripeSubscription(stripe, stripeCustomerId);

  let previousSessions = await listProCheckoutSessions(
    stripe,
    stripeCustomerId,
    userId,
  );
  const openSessions = previousSessions.filter(
    (candidate) => candidate.status === "open",
  );

  if (openSessions.length === 1) {
    const onlyOpenSession = openSessions[0]!;
    const openPriceId = await getCheckoutSessionPriceId(
      stripe,
      onlyOpenSession,
    );
    if (openPriceId === priceId && onlyOpenSession.url) {
      return { url: onlyOpenSession.url };
    }
  }

  if (openSessions.length > 0) {
    const expirationResults = await Promise.allSettled(
      openSessions.map((session) =>
        stripe.checkout.sessions.expire(session.id),
      ),
    );
    const expirationFailed = expirationResults.some(
      (result) => result.status === "rejected",
    );

    if (expirationFailed) {
      // Never create after an uncertain expiration. Recheck both authoritative
      // Stripe surfaces, then ask the client to retry from a clean snapshot.
      await assertNoExistingStripeSubscription(stripe, stripeCustomerId);
      await listProCheckoutSessions(stripe, stripeCustomerId, userId);
      throwValidationError(
        "We could not safely replace the previous checkout. Please try again.",
      );
    }

    const expiredById = new Map(
      expirationResults.flatMap((result) =>
        result.status === "fulfilled"
          ? [[result.value.id, result.value] as const]
          : [],
      ),
    );
    previousSessions = previousSessions
      .map((session) => expiredById.get(session.id) ?? session)
      .sort((left, right) => right.created - left.created);
  }

  const previousSession = previousSessions[0];
  const createParams: Stripe.Checkout.SessionCreateParams = {
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: { userId, plan: "pro", checkoutPriceId: priceId },
    subscription_data: { metadata: { userId, plan: "pro" } },
  };

  // Recheck immediately before creating. This closes the race where Checkout
  // completed while open sessions were being expired or inspected.
  await assertNoExistingStripeSubscription(stripe, stripeCustomerId);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(createParams, {
      idempotencyKey: stripeCheckoutIntentIdempotencyKey(
        userId,
        previousSession?.id ?? null,
      ),
    });
  } catch (error) {
    if (!isStripeIdempotencyConflict(error)) throw error;

    const concurrentSession = await waitForConcurrentCheckoutSession(
      stripe,
      stripeCustomerId,
      userId,
    );
    if (!concurrentSession?.url) throw error;

    const concurrentPriceId = await getCheckoutSessionPriceId(
      stripe,
      concurrentSession,
    );
    if (concurrentPriceId !== priceId) {
      throwValidationError(
        "Another checkout option was just selected. Please try again.",
      );
    }
    session = concurrentSession;
  }

  if (!session.url) {
    throwConfigurationError("Stripe did not return a checkout URL");
  }
  return { url: session.url };
}
