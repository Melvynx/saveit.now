type ShareSaveStateInput = {
  hasPayload: boolean;
  hasBlockingError: boolean;
  isAuthLoading: boolean;
  hasUser: boolean;
  isAuthenticated: boolean;
  hasStartedCreate: boolean;
};

export function deriveShareSaveState({
  hasPayload,
  hasBlockingError,
  isAuthLoading,
  hasUser,
  isAuthenticated,
  hasStartedCreate,
}: ShareSaveStateInput) {
  return {
    needsAuth: hasPayload && !isAuthLoading && !hasUser,
    isWaitingForAuth: hasPayload && isAuthLoading,
    canStartCreate:
      hasPayload && !hasBlockingError && isAuthenticated && !hasStartedCreate,
    isSaveAttemptInFlight: hasPayload && !hasBlockingError && hasStartedCreate,
  };
}
