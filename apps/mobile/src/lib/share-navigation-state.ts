type ShareNavigationStateInput = {
  hasUser: boolean;
  onboarding: boolean | null | undefined;
  segments: readonly string[];
};

type ShareUnderlayRoute = "/" | "/welcome" | "/(tabs)";

export function deriveShareNavigationState({
  hasUser,
  onboarding,
  segments,
}: ShareNavigationStateInput) {
  const underlayRoute: ShareUnderlayRoute = !hasUser
    ? "/"
    : onboarding === false
      ? "/welcome"
      : "/(tabs)";
  const expectedSegment = !hasUser
    ? undefined
    : onboarding === false
      ? "welcome"
      : "(tabs)";

  return {
    underlayRoute,
    isShareRoute: segments[0] === "share-handler",
    hasValidUnderlay: expectedSegment
      ? segments[0] === expectedSegment
      : segments.length === 0,
  };
}
