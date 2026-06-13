// Build-time configuration for Chrome extension
// __BASE_URL__ — app origin (https://saveit.now); serves the sign-in page and
// proxies /api/auth/* and /api/bookmarks* to the Convex backend.
// Injected by esbuild define in scripts/copy-assets.js.

declare const __BASE_URL__: string;
declare const __IS_DEV__: boolean;

export const config = {
  BASE_URL: __BASE_URL__,
  IS_DEV: __IS_DEV__,
} as const;
