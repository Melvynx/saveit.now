import { describe, expect, it } from "vitest";
import { deriveEffectivePlan, getLimits } from "./plans";

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

  describe("canceled Stripe subscription with a paid period", () => {
    const now = 1_000_000;
    const paidPeriod = {
      plan: "pro",
      provider: "stripe" as const,
      status: "canceled",
      periodEnd: now + 1,
    };

    it("stays Pro until the paid period ends", () => {
      expect(deriveEffectivePlan(paidPeriod, now)).toBe("pro");
      expect(deriveEffectivePlan(paidPeriod, now + 1)).toBe("free");
    });

    it.each([
      { ...paidPeriod, plan: "free" },
      { ...paidPeriod, provider: null },
      { ...paidPeriod, provider: "appstore" as const },
      { ...paidPeriod, periodEnd: null },
    ])("only applies to Stripe Pro rows with a period end", (subscription) => {
      expect(deriveEffectivePlan(subscription, now)).toBe("free");
    });
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
