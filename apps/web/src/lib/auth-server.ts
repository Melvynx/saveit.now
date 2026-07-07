import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { getConvexSiteUrl, getConvexUrl } from "./convex-url";

const convexUrl = getConvexUrl();
export const convexSiteUrl = getConvexSiteUrl(convexUrl);
const cookiePrefix = process.env.BETTER_AUTH_COOKIE_PREFIX?.trim() || "save-it";

/**
 * SSR auth bindings. `cookiePrefix` MUST match the backend
 * BETTER_AUTH_COOKIE_PREFIX ("save-it"). Use `fetchAuthQuery`/`fetchAuthMutation`/
 * `fetchAuthAction` in route loaders/`beforeLoad` (never a raw Convex client in SSR).
 */
export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
  cookiePrefix,
});
