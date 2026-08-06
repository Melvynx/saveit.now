type AuthStateInput = {
  sessionPending: boolean;
  hasResolvedSession: boolean;
  hasSessionUser: boolean;
  convexAuthLoading: boolean;
  convexAuthenticated: boolean;
};

export function deriveAuthState({
  sessionPending,
  hasResolvedSession,
  hasSessionUser,
  convexAuthLoading,
  convexAuthenticated,
}: AuthStateInput) {
  const isAuthenticated = hasSessionUser && convexAuthenticated;

  return {
    isAuthenticated,
    isLoading:
      (sessionPending && !hasResolvedSession) ||
      (hasSessionUser && convexAuthLoading),
    canExposeUser: isAuthenticated,
  };
}
