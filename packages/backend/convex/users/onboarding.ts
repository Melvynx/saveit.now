import { v } from "convex/values";
import type { PlanName } from "../billing/plans";

export const onboardingUpgradeChoiceValidator = v.union(
  v.literal("free"),
  v.literal("upgrade"),
);

export type OnboardingUpgradeChoice = "free" | "upgrade";

export type OnboardingFlowState = {
  needsOnboarding: boolean;
  offerChoice: OnboardingUpgradeChoice | null;
  effectivePlan: PlanName;
  shouldShowUpgradeOffer: boolean;
};

export function deriveOnboardingFlowState({
  onboarding,
  offerChoice,
  effectivePlan,
}: {
  onboarding: boolean | null | undefined;
  offerChoice: string | null | undefined;
  effectivePlan: PlanName;
}): OnboardingFlowState {
  const normalizedChoice: OnboardingUpgradeChoice | null =
    offerChoice === "free" || offerChoice === "upgrade" ? offerChoice : null;
  const needsOnboarding = onboarding === false;

  return {
    needsOnboarding,
    offerChoice: normalizedChoice,
    effectivePlan,
    shouldShowUpgradeOffer:
      needsOnboarding && normalizedChoice === null && effectivePlan === "free",
  };
}
