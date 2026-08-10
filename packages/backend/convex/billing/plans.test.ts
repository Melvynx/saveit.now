import { describe, expect, it } from "vitest";
import {
  deriveEffectivePlan,
  getLimits,
  pickCanonicalSubscription,
} from "./plans";

describe("deriveEffectivePlan", () => {
  it("defaults missing subscriptions to free", () => {
    expect(deriveEffectivePlan(null)).toBe("free");
  });

  it.each(["active", "trialing"])(
    "grants Pro for a Pro subscription with %s status",
    (status) => {
      expect(deriveEffectivePlan({ plan: "pro", status })).toBe("pro");
    },
  );

  it("keeps App Store grace-period subscriptions on Pro", () => {
    expect(
      deriveEffectivePlan({
        plan: "pro",
        provider: "appstore",
        status: "past_due",
      }),
    ).toBe("pro");
  });

  it("does not grant Pro for Stripe past_due subscriptions", () => {
    expect(
      deriveEffectivePlan({
        plan: "pro",
        provider: "stripe",
        status: "past_due",
      }),
    ).toBe("free");
  });

  it("grants Pro for manual lifetime access", () => {
    expect(
      deriveEffectivePlan({
        plan: "pro",
        provider: "manual",
        status: "lifetime",
      }),
    ).toBe("pro");
  });

  it.each([
    { plan: "free", status: "active" },
    { plan: "pro", status: "canceled" },
    { plan: "enterprise", status: "active" },
  ])("requires both the Pro plan and an entitled status", (subscription) => {
    expect(deriveEffectivePlan(subscription)).toBe("free");
  });
});

describe("getLimits", () => {
  it("honors Better Auth component custom metadata", () => {
    expect(
      getLimits("free", {
        customLimits: {
          bookmarks: 321,
          canExport: 1,
        },
      }),
    ).toMatchObject({
      bookmarks: 321,
      canExport: 1,
      apiAccess: 0,
    });
  });
});

describe("pickCanonicalSubscription", () => {
  it("uses the newest subscription row instead of an older active row", () => {
    const olderActive = {
      plan: "pro",
      provider: "stripe" as const,
      status: "active",
      createdAt: 100,
      updatedAt: 100,
    };
    const newerCanceled = {
      plan: "free",
      provider: "stripe" as const,
      status: "canceled",
      createdAt: 200,
      updatedAt: 300,
    };

    expect(pickCanonicalSubscription([olderActive, newerCanceled])).toBe(
      newerCanceled,
    );
    expect(
      deriveEffectivePlan(pickCanonicalSubscription([olderActive, newerCanceled])),
    ).toBe("free");
  });

  it("requires newest-first bounded scans so more than 20 historical rows cannot hide the latest downgrade", () => {
    const olderActiveRows = Array.from({ length: 20 }, (_, index) => ({
      plan: "pro",
      provider: "stripe" as const,
      status: "active",
      createdAt: index + 1,
      updatedAt: index + 1,
    }));
    const newestCanceled = {
      plan: "free",
      provider: "stripe" as const,
      status: "canceled",
      createdAt: 21,
      updatedAt: 21,
    };
    const oldestFirstByUserRows = [...olderActiveRows, newestCanceled];

    const defaultOldestFirstBoundedScan = oldestFirstByUserRows.slice(0, 20);
    expect(
      deriveEffectivePlan(
        pickCanonicalSubscription(defaultOldestFirstBoundedScan),
      ),
    ).toBe("pro");

    const newestFirstBoundedScan = [...oldestFirstByUserRows]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 20);

    expect(pickCanonicalSubscription(newestFirstBoundedScan)).toBe(
      newestCanceled,
    );
    expect(
      deriveEffectivePlan(pickCanonicalSubscription(newestFirstBoundedScan)),
    ).toBe("free");
  });

  it("keeps manual lifetime access canonical even when billing rows are newer", () => {
    const lifetime = {
      plan: "pro",
      provider: "manual" as const,
      status: "lifetime",
      createdAt: 100,
      updatedAt: 100,
    };
    const newerCanceled = {
      plan: "free",
      provider: "stripe" as const,
      status: "canceled",
      createdAt: 200,
      updatedAt: 300,
    };

    expect(pickCanonicalSubscription([newerCanceled, lifetime])).toBe(lifetime);
    expect(deriveEffectivePlan(pickCanonicalSubscription([newerCanceled, lifetime]))).toBe(
      "pro",
    );
  });
});
