const missingConvexUrlMessage = "VITE_CONVEX_URL is not set";

function cleanEnvValue(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readProcessEnv(name: string) {
  if (typeof process === "undefined") {
    return undefined;
  }

  return cleanEnvValue(process.env[name]);
}

export function getConvexUrl() {
  const convexUrl =
    cleanEnvValue(import.meta.env.VITE_CONVEX_URL) ??
    readProcessEnv("VITE_CONVEX_URL");

  if (!convexUrl) {
    throw new Error(missingConvexUrlMessage);
  }

  return convexUrl;
}

export function getConvexSiteUrl(convexUrl = getConvexUrl()) {
  const explicitSiteUrl =
    cleanEnvValue(import.meta.env.VITE_CONVEX_SITE_URL) ??
    readProcessEnv("VITE_CONVEX_SITE_URL") ??
    readProcessEnv("CONVEX_SITE_URL");

  if (explicitSiteUrl) {
    return explicitSiteUrl;
  }

  if (convexUrl.endsWith(".convex.cloud")) {
    return convexUrl.replace(".convex.cloud", ".convex.site");
  }

  throw new Error(
    "VITE_CONVEX_SITE_URL is not set and could not be derived from VITE_CONVEX_URL",
  );
}
