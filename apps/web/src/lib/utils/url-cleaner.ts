/**
 * Removes common tracking parameters from URLs
 * @param url - The URL to clean
 * @returns The cleaned URL without tracking parameters
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // List of tracking parameters to remove
    const trackingParams = [
      // UTM parameters
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'utm_id',
      'utm_source_platform',
      'utm_creative_format',
      'utm_marketing_tactic',
      
      // Facebook tracking
      'fbclid',
      'fb_action_ids',
      'fb_action_types',
      'fb_ref',
      'fb_source',
      
      // Google tracking
      'gclid',
      'gclsrc',
      'dclid',
      'gbraid',
      'wbraid',
      
      // Instagram
      'igshid',
      'igsh',
      
      // Twitter
      'ref_src',
      'ref_url',
      'twclid',
      
      // LinkedIn
      'li_source',
      'li_medium',
      'li_campaign',
      'li_content',
      'li_term',
      'trk',
      
      // Email marketing
      'mc_cid',
      'mc_eid',
      'ck_subscriber_id',
      'campaign_id',
      'tracking_id',
      'source_id',
      'email_id',
      
      // Microsoft
      'msclkid',
      'ms_c',
      
      // TikTok
      'tt_medium',
      'tt_content',
      'ttclid',
      
      // Pinterest
      'epik',
      
      // YouTube
      'feature',
      'kw',
      
      // Other common tracking parameters
      'ref',
      'referer',
      'source',
      'medium',
      'campaign',
      'content',
      'term',
      'affiliate_id',
      'partner_id',
      'click_id',
      'impression_id',
      'ad_id',
      'creative_id',
      'placement_id',
      'site_id',
      'network_id',
      'sub_id',
      'pub_id',
      'aff_id',
      'cid',
      'sid',
      'tid',
      'pid',
      'aid',
      'oid',
      'vid',
      'rid',
      'uid',
      'lid',
      'mid',
    ];
    
    // Remove tracking parameters
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Return the cleaned URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to clean URL:', url, error);
    return url;
  }
}