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
