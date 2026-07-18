import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  createOrReuseProCheckoutSession,
  isTerminalStripeSubscriptionStatus,
} from "./checkout";

function checkoutSession({
  id,
  priceId,
  status = "open",
}: {
  id: string;
  priceId: string;
  status?: Stripe.Checkout.Session.Status;
}): Stripe.Checkout.Session {
  return {
    id,
    created: Number(id.replace(/\D/g, "")) || 1,
    mode: "subscription",
    status,
    url: status === "open" ? `https://checkout.stripe.test/${id}` : null,
    metadata: {
      userId: "user_123",
      plan: "pro",
      checkoutPriceId: priceId,
    },
  } as unknown as Stripe.Checkout.Session;
}

function subscription(status: Stripe.Subscription.Status): Stripe.Subscription {
  return { id: `sub_${status}`, status } as Stripe.Subscription;
}

type MockSubscriptionPage =
  | Stripe.Subscription[]
  | { data: Stripe.Subscription[]; hasMore: boolean };

function stripeMock({
  subscriptionPages = [[]],
  checkoutSessions = [],
  expire,
}: {
  subscriptionPages?: MockSubscriptionPage[];
  checkoutSessions?: Stripe.Checkout.Session[];
  expire?: (id: string) => Promise<Stripe.Checkout.Session>;
} = {}) {
  let subscriptionPage = 0;
  const subscriptionsList = vi.fn(
    async (_params?: Stripe.SubscriptionListParams) => {
      const configuredPage =
        subscriptionPages[
          Math.min(subscriptionPage++, subscriptionPages.length - 1)
        ] ?? [];
      return Array.isArray(configuredPage)
        ? { data: configuredPage, has_more: false }
        : { data: configuredPage.data, has_more: configuredPage.hasMore };
    },
  );
  const sessionsList = vi.fn(async () => ({ data: checkoutSessions }));
  const sessionsExpire = vi.fn(
    expire ??
      (async (id: string) => {
        const current = checkoutSessions.find((session) => session.id === id)!;
        return { ...current, status: "expired", url: null };
      }),
  );
  const sessionsCreate = vi.fn(async () =>
    checkoutSession({ id: "cs_999", priceId: "price_requested" }),
  );
  const sessionsListLineItems = vi.fn(async () => ({ data: [] }));

  return {
    stripe: {
      subscriptions: { list: subscriptionsList },
      checkout: {
        sessions: {
          list: sessionsList,
          expire: sessionsExpire,
          create: sessionsCreate,
          listLineItems: sessionsListLineItems,
        },
      },
    } as unknown as Stripe,
    subscriptionsList,
    sessionsList,
    sessionsExpire,
    sessionsCreate,
  };
}

const createCheckout = (stripe: Stripe) =>
  createOrReuseProCheckoutSession({
    stripe,
    stripeCustomerId: "cus_123",
    userId: "user_123",
    priceId: "price_requested",
    successUrl: "https://saveit.test/success",
    cancelUrl: "https://saveit.test/cancel",
  });

describe("Stripe Checkout subscription guard", () => {
  it.each(["canceled", "incomplete_expired"] as const)(
    "allows a new attempt after terminal status %s",
    (status) => {
      expect(isTerminalStripeSubscriptionStatus(status)).toBe(true);
    },
  );

  it.each([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ] as const)(
    "blocks duplicate Checkout for nonterminal status %s",
    (status) => {
      expect(isTerminalStripeSubscriptionStatus(status)).toBe(false);
    },
  );

  it("blocks an active subscription before reusing an open session", async () => {
    const open = checkoutSession({
      id: "cs_1",
      priceId: "price_requested",
    });
    const mocks = stripeMock({
      subscriptionPages: [[subscription("active")]],
      checkoutSessions: [open],
    });

    await expect(createCheckout(mocks.stripe)).rejects.toThrow(
      "A Stripe subscription already exists",
    );
    expect(mocks.sessionsList).not.toHaveBeenCalled();
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("finds an active subscription on a later page before Checkout", async () => {
    const mocks = stripeMock({
      subscriptionPages: [
        {
          data: [subscription("canceled"), subscription("incomplete_expired")],
          hasMore: true,
        },
        { data: [subscription("active")], hasMore: false },
      ],
      checkoutSessions: [
        checkoutSession({ id: "cs_1", priceId: "price_requested" }),
      ],
    });

    await expect(createCheckout(mocks.stripe)).rejects.toThrow(
      "A Stripe subscription already exists",
    );
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(2);
    expect(mocks.subscriptionsList.mock.calls[1]?.[0]).toMatchObject({
      starting_after: "sub_incomplete_expired",
    });
    expect(mocks.sessionsList).not.toHaveBeenCalled();
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("expires every open session before creating a replacement", async () => {
    const mocks = stripeMock({
      checkoutSessions: [
        checkoutSession({ id: "cs_1", priceId: "price_monthly" }),
        checkoutSession({ id: "cs_2", priceId: "price_yearly" }),
      ],
    });

    await expect(createCheckout(mocks.stripe)).resolves.toEqual({
      url: "https://checkout.stripe.test/cs_999",
    });
    expect(mocks.sessionsExpire).toHaveBeenCalledTimes(2);
    expect(mocks.sessionsExpire.mock.calls.map(([id]) => id).sort()).toEqual([
      "cs_1",
      "cs_2",
    ]);
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(2);
    expect(
      Math.max(...mocks.sessionsExpire.mock.invocationCallOrder),
    ).toBeLessThan(mocks.sessionsCreate.mock.invocationCallOrder[0]!);
    expect(mocks.subscriptionsList.mock.invocationCallOrder[1]!).toBeLessThan(
      mocks.sessionsCreate.mock.invocationCallOrder[0]!,
    );
  });

  it("attempts every expiration but never creates when one fails", async () => {
    const sessions = [
      checkoutSession({ id: "cs_1", priceId: "price_monthly" }),
      checkoutSession({ id: "cs_2", priceId: "price_yearly" }),
    ];
    const mocks = stripeMock({
      checkoutSessions: sessions,
      expire: async (id) => {
        if (id === "cs_1") throw new Error("Stripe timeout");
        const current = sessions.find((session) => session.id === id)!;
        return { ...current, status: "expired", url: null };
      },
    });

    await expect(createCheckout(mocks.stripe)).rejects.toThrow(
      "could not safely replace",
    );
    expect(mocks.sessionsExpire).toHaveBeenCalledTimes(2);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    expect(mocks.subscriptionsList).toHaveBeenCalledTimes(2);
    expect(mocks.sessionsList.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("never creates when a switched Checkout completes during expiration", async () => {
    const mocks = stripeMock({
      subscriptionPages: [[], [subscription("active")]],
      checkoutSessions: [
        checkoutSession({ id: "cs_1", priceId: "price_monthly" }),
      ],
    });

    await expect(createCheckout(mocks.stripe)).rejects.toThrow(
      "A Stripe subscription already exists",
    );
    expect(mocks.sessionsExpire).toHaveBeenCalledOnce();
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
