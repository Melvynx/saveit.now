import { describe, expect, it } from "vitest";
import { preserveFirstOnboardingUpgradeChoice } from "./onboarding";

describe("preserveFirstOnboardingUpgradeChoice", () => {
  it.each(["free", "upgrade"] as const)(
    "records the first %s choice",
    (choice) => {
      expect(preserveFirstOnboardingUpgradeChoice(null, choice)).toBe(choice);
    },
  );

  it("leaves the choice absent for compatible older clients", () => {
    expect(
      preserveFirstOnboardingUpgradeChoice(undefined, undefined),
    ).toBeNull();
  });

  it.each([
    ["free", "upgrade", "free"],
    ["upgrade", "free", "upgrade"],
  ] as const)(
    "keeps terminal choice %s when %s is requested later",
    (current, requested, expected) => {
      expect(preserveFirstOnboardingUpgradeChoice(current, requested)).toBe(
        expected,
      );
    },
  );
});
