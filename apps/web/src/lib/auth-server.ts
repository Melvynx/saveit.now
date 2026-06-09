import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

const convexUrl =
  import.meta.env.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? "";
const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL ?? "";
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
