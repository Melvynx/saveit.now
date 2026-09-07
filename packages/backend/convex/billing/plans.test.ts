import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveEffectivePlan, getCanonicalSubscription, getLimits } from "./plans";

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

describe("getCanonicalSubscription", () => {
  it("does not let an older active row grant Pro after a newer cancellation", () => {
    const subscription = getCanonicalSubscription([
      {
        plan: "pro",
        provider: "stripe",
        status: "active",
        createdAt: 100,
      },
      {
        plan: "free",
        provider: "stripe",
        status: "canceled",
        createdAt: 200,
      },
    ]);

    expect(subscription?.status).toBe("canceled");
    expect(deriveEffectivePlan(subscription)).toBe("free");
  });

  it("keeps a manual lifetime grant canonical regardless of later billing rows", () => {
    const subscription = getCanonicalSubscription([
      {
        plan: "pro",
        provider: "manual",
        status: "lifetime",
        createdAt: 100,
      },
      {
        plan: "free",
        provider: "stripe",
        status: "canceled",
        createdAt: 200,
      },
    ]);

    expect(subscription?.provider).toBe("manual");
    expect(deriveEffectivePlan(subscription)).toBe("pro");
  });
});

describe("subscription entitlement call sites", () => {
  it("uses canonical subscription selection for chat limit paths", () => {
    for (const relativePath of [
      "../chat/mutations.ts",
      "../chat/queries.ts",
      "../users/queries.ts",
    ]) {
      const source = readFileSync(
        path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          relativePath,
        ),
        "utf8",
      );

      expect(source).toContain("getCanonicalSubscription(");
      expect(source).not.toMatch(/allSubs\.some\([\s\S]*deriveEffectivePlan/);
    }
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
