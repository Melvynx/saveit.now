import { describe, expect, it } from "vitest";
import { AUTH_LIMITS, getAuthLimits, parseCustomAuthLimits } from "../src/lib/auth-limits";

describe("auth limits", () => {
  it("uses the subscription plan limits by default", () => {
    expect(getAuthLimits({ plan: "pro" })).toEqual(AUTH_LIMITS.pro);
  });

  it("overrides only custom limits provided in user metadata", () => {
    expect(
      getAuthLimits({ plan: "free" }, { customLimits: { monthlyBookmarkRuns: 250 } }),
    ).toEqual({
      ...AUTH_LIMITS.free,
      monthlyBookmarkRuns: 250,
    });
  });

  it("keeps zero custom limits so admins can disable a capability", () => {
    expect(
      getAuthLimits({ plan: "pro" }, { customLimits: { apiAccess: 0 } }).apiAccess,
    ).toBe(0);
  });

  it("ignores invalid custom limit metadata", () => {
    expect(
      parseCustomAuthLimits({
        customLimits: {
          bookmarks: -1,
          monthlyBookmarkRuns: "a lot",
          monthlyChatQueries: 42,
        },
      }),
    ).toEqual({ monthlyChatQueries: 42 });
  });
});
