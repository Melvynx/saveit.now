export type OnboardingUpgradeChoice = "free" | "upgrade";

export function preserveFirstOnboardingUpgradeChoice(
  current: string | null | undefined,
  requested: OnboardingUpgradeChoice | undefined,
): OnboardingUpgradeChoice | null {
  if (current === "free" || current === "upgrade") return current;
  return requested ?? null;
}
