// Build-time configuration for Chrome extension
// __BASE_URL__ — app origin (https://saveit.now), used for navigation (sign-in page, etc.)
// __CONVEX_SITE_URL__ — Convex .site URL, used for auth (/api/auth/*) and API (/api/bookmarks)
// Both are injected by esbuild define in scripts/copy-assets.js.

declare const __BASE_URL__: string;
declare const __CONVEX_SITE_URL__: string;
declare const __IS_DEV__: boolean;

export const config = {
  BASE_URL: __BASE_URL__,
  CONVEX_SITE_URL: __CONVEX_SITE_URL__,
  IS_DEV: __IS_DEV__,
} as const;