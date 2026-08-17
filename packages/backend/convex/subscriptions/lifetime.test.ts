import { describe, expect, it } from "vitest";
import { deriveEffectivePlan } from "../billing/plans";
import { lifetimeProFields } from "./lifetime";

describe("lifetimeProFields", () => {
  it("is a 100% forever Pro grant with no billing-provider identity", () => {
    const fields = lifetimeProFields(1_700_000_000_000);
    expect(fields).toMatchObject({
      plan: "pro",
      provider: "manual",
      status: "lifetime",
      cancelAtPeriodEnd: false,
      periodStart: 1_700_000_000_000,
    });
    expect(deriveEffectivePlan(fields)).toBe("pro");
  });
});
