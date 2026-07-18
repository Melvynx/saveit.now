const DEFAULT_INTERNAL_REDIRECT = "/app";
const SAFE_REDIRECT_ORIGIN = "https://saveit.invalid";
const MAX_DECODE_DEPTH = 4;

function hasUnsafeRedirectCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      character === "\\" ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    ) {
      return true;
    }
  }

  return false;
}

function hasUnsafeNetworkPathVariant(value: string): boolean {
  if (hasUnsafeRedirectCharacter(value)) return true;

  let candidate = value.split(/[?#]/u, 1)[0] ?? "";

  for (let depth = 0; depth < MAX_DECODE_DEPTH; depth += 1) {
    if (hasUnsafeRedirectCharacter(candidate)) return true;
    if (candidate.startsWith("//")) return true;

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) return false;
      candidate = decoded;
    } catch {
      return depth === 0;
    }
  }

  return true;
}

export function getSafeInternalRedirectUrl(redirectUrl?: string): string {
  if (
    !redirectUrl?.startsWith("/") ||
    hasUnsafeNetworkPathVariant(redirectUrl)
  ) {
    return DEFAULT_INTERNAL_REDIRECT;
  }

  try {
    const parsed = new URL(redirectUrl, SAFE_REDIRECT_ORIGIN);
    if (parsed.origin !== SAFE_REDIRECT_ORIGIN) {
      return DEFAULT_INTERNAL_REDIRECT;
    }
  } catch {
    return DEFAULT_INTERNAL_REDIRECT;
  }

  return redirectUrl;
}
