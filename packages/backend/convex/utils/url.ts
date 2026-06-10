/**
 * URL cleaning utilities — strips tracking parameters before storing bookmarks.
 * Verbatim port from apps/web/src/lib/utils/url-cleaner.ts (Spec 02 §1.16).
 */

const TRACKING_PARAMS = [
  // UTM
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  // Facebook
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_ref",
  "fb_source",
  // Google
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  // Instagram
  "igshid",
  "igsh",
  // Twitter / X
  "ref_src",
  "ref_url",
  "twclid",
  // LinkedIn
  "li_source",
  "li_medium",
  "li_campaign",
  "li_content",
  "li_term",
  "trk",
  // Email / CRM
  "mc_cid",
  "mc_eid",
  "ck_subscriber_id",
  "campaign_id",
  "tracking_id",
  "source_id",
  "email_id",
  // Microsoft
  "msclkid",
  "ms_c",
  // TikTok
  "tt_medium",
  "tt_content",
  "ttclid",
  // Pinterest
  "epik",
  // Generic
  "feature",
  "kw",
  "ref",
  "referer",
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "affiliate_id",
  "partner_id",
  "click_id",
  "impression_id",
  "ad_id",
  "creative_id",
  "placement_id",
  "site_id",
  "network_id",
  "sub_id",
  "pub_id",
  "aff_id",
  "cid",
  "sid",
  "tid",
  "pid",
  "aid",
  "oid",
  "vid",
  "rid",
  "uid",
  "lid",
  "mid",
] as const;

/**
 * Strips known tracking query parameters from a URL.
 * Falls back to the original URL string if parsing fails.
 */
export function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "metadata.google.internal"
  ) {
    return true;
  }

  if (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }

  return isPrivateIpv4(normalized);
}

export function assertSafeHttpUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("This URL host is not allowed");
  }

  return parsed.toString();
}
