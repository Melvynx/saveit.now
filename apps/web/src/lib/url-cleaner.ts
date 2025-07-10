/**
 * List of tracking parameters to remove from URLs
 * Based on common tracking parameters from various platforms and services
 */
const TRACKING_PARAMETERS = [
  // Google Analytics / Marketing
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",

  // Google Ads
  "gclid",
  "gclsrc",
  "dclid",
  "wbraid",
  "gbraid",

  // Facebook
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_ref",
  "fb_source",

  // Instagram
  "igshid",
  "igsh",

  // Twitter/X
  "ref_src",
  "ref_url",
  "s",
  "t",

  // LinkedIn
  "trk",
  "trkCampaign",
  "li_fat_id",

  // Email Marketing
  "mc_cid", // Mailchimp
  "mc_eid", // Mailchimp
  "ck_subscriber_id", // ConvertKit
  "campaign_id",
  "tracking_id",
  "email_id",
  "subscriber_id",

  // Other common tracking
  "ref",
  "source",
  "medium",
  "campaign",
  "_hsenc", // HubSpot
  "_hsmi", // HubSpot
  "hsCtaTracking", // HubSpot
  "vero_conv", // Vero
  "vero_id", // Vero
  "wickedid", // Wicked Reports
  "yclid", // Yandex
  "msclkid", // Microsoft/Bing
  "epik", // Pinterest
  "pp", // Pinterest
  "_branch_match_id", // Branch.io
  "spm", // Alibaba
  "scm", // Alibaba
  "share_from", // TikTok
  "checksum", // TikTok
  "timestamp", // Generic timestamp tracking
  "hash", // Generic hash tracking
] as const;

/**
 * Removes tracking parameters from a URL while preserving functional parameters
 * @param url - The URL to clean
 * @returns The cleaned URL string
 * @throws Error if the URL is invalid
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Get all search parameters
    const searchParams = new URLSearchParams(urlObj.search);

    // Remove tracking parameters
    for (const param of TRACKING_PARAMETERS) {
      searchParams.delete(param);
    }

    // Reconstruct the URL
    urlObj.search = searchParams.toString();

    return urlObj.toString();
  } catch {
    // If URL parsing fails, throw a descriptive error
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Checks if a URL contains any tracking parameters
 * @param url - The URL to check
 * @returns True if the URL contains tracking parameters
 */
export function hasTrackingParameters(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    return TRACKING_PARAMETERS.some((param) => searchParams.has(param));
  } catch {
    return false;
  }
}

/**
 * Gets a list of tracking parameters found in a URL
 * @param url - The URL to analyze
 * @returns Array of tracking parameter names found in the URL
 */
export function getTrackingParameters(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    return TRACKING_PARAMETERS.filter((param) => searchParams.has(param));
  } catch {
    return [];
  }
}
