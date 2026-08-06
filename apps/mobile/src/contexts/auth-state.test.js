/* global describe, expect, test */

import { deriveAuthState } from "./auth-state";

describe("deriveAuthState", () => {
  test("keeps a Better Auth session hidden while Convex installs its token", () => {
    expect(
      deriveAuthState({
        sessionPending: false,
        hasResolvedSession: true,
        hasSessionUser: true,
        convexAuthLoading: true,
        convexAuthenticated: false,
      }),
    ).toEqual({
      isAuthenticated: false,
      isLoading: true,
      canExposeUser: false,
    });
  });

  test("exposes the user only after the Convex provider authenticates", () => {
    expect(
      deriveAuthState({
        sessionPending: false,
        hasResolvedSession: true,
        hasSessionUser: true,
        convexAuthLoading: false,
        convexAuthenticated: true,
      }),
    ).toEqual({
      isAuthenticated: true,
      isLoading: false,
      canExposeUser: true,
    });
  });

  test("does not remount a signed-out foreground session behind a loader", () => {
    expect(
      deriveAuthState({
        sessionPending: true,
        hasResolvedSession: true,
        hasSessionUser: false,
        convexAuthLoading: false,
        convexAuthenticated: false,
      }),
    ).toEqual({
      isAuthenticated: false,
      isLoading: false,
      canExposeUser: false,
    });
  });
});
