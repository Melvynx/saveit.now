import { describe, expect, it } from "vitest";
import { deriveOnboardingFlowState } from "./onboarding";

describe("deriveOnboardingFlowState", () => {
  it("shows the offer to a genuinely new free user", () => {
    expect(
      deriveOnboardingFlowState({
        onboarding: false,
        offerChoice: null,
        effectivePlan: "free",
      }),
    ).toEqual({
      needsOnboarding: true,
      offerChoice: null,
      effectivePlan: "free",
      shouldShowUpgradeOffer: true,
    });
  });

  it.each([undefined, null, true])(
    "does not restart onboarding for legacy or completed value %s",
    (onboarding) => {
      expect(
        deriveOnboardingFlowState({
          onboarding,
          offerChoice: null,
          effectivePlan: "free",
        }).shouldShowUpgradeOffer,
      ).toBe(false);
    },
  );

  it("does not show the offer to an already entitled user", () => {
    expect(
      deriveOnboardingFlowState({
        onboarding: false,
        offerChoice: null,
        effectivePlan: "pro",
      }).shouldShowUpgradeOffer,
    ).toBe(false);
  });

  it.each(["free", "upgrade"] as const)(
    "preserves the %s choice and never shows the offer again",
    (offerChoice) => {
      expect(
        deriveOnboardingFlowState({
          onboarding: false,
          offerChoice,
          effectivePlan: "free",
        }),
      ).toMatchObject({
        offerChoice,
        shouldShowUpgradeOffer: false,
      });
    },
  );

  it("does not treat an unknown stored value as a choice", () => {
    expect(
      deriveOnboardingFlowState({
        onboarding: false,
        offerChoice: "unexpected",
        effectivePlan: "free",
      }),
    ).toMatchObject({ offerChoice: null, shouldShowUpgradeOffer: true });
  });
});
