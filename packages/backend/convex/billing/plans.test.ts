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
