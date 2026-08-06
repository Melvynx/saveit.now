/* global describe, expect, test */

import { deriveShareNavigationState } from "./share-navigation-state";

describe("deriveShareNavigationState", () => {
  test("normalizes an authenticated cold deep link to the library", () => {
    expect(
      deriveShareNavigationState({
        hasUser: true,
        onboarding: true,
        segments: ["[...slug]"],
      }),
    ).toEqual({
      underlayRoute: "/(tabs)",
      isShareRoute: false,
      hasValidUnderlay: false,
    });
  });

  test("recognizes the library as a valid authenticated underlay", () => {
    expect(
      deriveShareNavigationState({
        hasUser: true,
        onboarding: true,
        segments: ["(tabs)"],
      }),
    ).toMatchObject({ underlayRoute: "/(tabs)", hasValidUnderlay: true });
  });

  test("uses welcome for unfinished authenticated onboarding", () => {
    expect(
      deriveShareNavigationState({
        hasUser: true,
        onboarding: false,
        segments: ["welcome"],
      }),
    ).toMatchObject({ underlayRoute: "/welcome", hasValidUnderlay: true });
  });

  test("keeps signed-out sharing over the onboarding index", () => {
    expect(
      deriveShareNavigationState({
        hasUser: false,
        onboarding: undefined,
        segments: [],
      }),
    ).toMatchObject({ underlayRoute: "/", hasValidUnderlay: true });
  });
});
