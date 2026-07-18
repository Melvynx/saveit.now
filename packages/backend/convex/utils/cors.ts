const configuredWebOrigins = () =>
  [
    process.env.SITE_URL,
    ...(
      process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
      process.env.TRUSTED_ORIGINS ??
      ""
    )
      .split(",")
      .map((origin) => origin.trim()),
  ].filter((origin): origin is string => Boolean(origin));

const normalizeOrigin = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

export function isAllowedWebOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const configured = configuredWebOrigins()
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));
  if (configured.includes(normalized)) return true;

  const parsed = new URL(normalized);
  if (
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  ) {
    return true;
  }

  if (parsed.protocol !== "https:") return false;
  if (
    parsed.hostname === "saveit.now" ||
    parsed.hostname.endsWith(".saveit.now")
  ) {
    return true;
  }

  return /^saveit-now(?:-[a-z0-9-]+)?-codelynx\.vercel\.app$/.test(
    parsed.hostname,
  );
}

export function webCorsHeaders(
  origin: string | null,
  options: { credentials?: boolean } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && isAllowedWebOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    if (options.credentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }
  }

  return headers;
}
