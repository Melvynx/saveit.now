/* global describe, expect, test */

import { deriveShareSaveState } from "./share-save-state";

const base = {
  hasPayload: true,
  hasBlockingError: false,
  isAuthLoading: false,
  hasUser: true,
  isAuthenticated: true,
  hasStartedCreate: false,
};

describe("deriveShareSaveState", () => {
  test("waits without starting a save or timeout while auth is loading", () => {
    expect(
      deriveShareSaveState({
        ...base,
        isAuthLoading: true,
        hasUser: false,
        isAuthenticated: false,
      }),
    ).toEqual({
      needsAuth: false,
      isWaitingForAuth: true,
      canStartCreate: false,
      isSaveAttemptInFlight: false,
    });
  });

  test("starts exactly once when Convex auth is ready", () => {
    expect(deriveShareSaveState(base)).toMatchObject({
      canStartCreate: true,
      isSaveAttemptInFlight: false,
    });

    expect(
      deriveShareSaveState({ ...base, hasStartedCreate: true }),
    ).toMatchObject({
      canStartCreate: false,
      isSaveAttemptInFlight: true,
    });
  });

  test("offers sign-in only after auth resolution confirms no user", () => {
    expect(
      deriveShareSaveState({
        ...base,
        hasUser: false,
        isAuthenticated: false,
      }),
    ).toMatchObject({
      needsAuth: true,
      isWaitingForAuth: false,
      canStartCreate: false,
    });
  });

  test("stops the active attempt when an error arrives so retry can reset it", () => {
    expect(
      deriveShareSaveState({
        ...base,
        hasStartedCreate: true,
        hasBlockingError: true,
      }),
    ).toMatchObject({
      canStartCreate: false,
      isSaveAttemptInFlight: false,
    });
  });
});
