/**
 * URL utilities for cleaning tracking parameters and normalizing URLs
 */

const TRACKING_PARAMETERS = [
  // UTM parameters (Google Analytics)
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  
  // Google Ads
  'gclid',
  'gclsrc',
  'dclid',
  'wbraid',
  'gbraid',
  
  // Facebook
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  
  // Instagram
  'igshid',
  'igsh',
  
  // Twitter
  'ref_src',
  'ref_url',
  't',
  's',
  
  // TikTok
  'tt_content',
  'tt_medium',
  
  // Email marketing
  'mc_cid',
  'mc_eid',
  'mc_tc',
  
  // ConvertKit
  'ck_subscriber_id',
  
  // Mailchimp
  'mc_cid',
  'mc_eid',
  
  // General tracking
  'ref',
  'source',
  'medium',
  'campaign',
  'tracking_id',
  'campaign_id',
  'content',
  'term',
  
  // Analytics
  '_ga',
  '_gl',
  '_gac',
  'ga_source',
  'ga_medium',
  'ga_campaign',
  'ga_term',
  'ga_content',
  
  // Affiliate/Partner tracking
  'affiliate_id',
  'partner_id',
  'referrer',
  'ref_id',
  
  // Social media general
  'share',
  'shared',
  'social_type',
  'social_source',
  
  // Other common tracking
  'hsCtaTracking',
  'hsa_acc',
  'hsa_ad',
  'hsa_cam',
  'hsa_grp',
  'hsa_kw',
  'hsa_mt',
  'hsa_net',
  'hsa_src',
  'hsa_tgt',
  'hsa_ver',
  '_hsenc',
  '_hsmi',
  
  // Microsoft/Bing
  'msclkid',
  
  // Pinterest
  'epik',
  
  // LinkedIn
  'li_fat_id',
  'trk',
  
  // Snapchat
  'ScCid',
  
  // Amazon
  'tag',
  'ascsubtag',
  'asc_campaign',
  'asc_refurl',
  'asc_source',
  
  // Generic campaign tracking
  'cid',
  'cmp',
  'cmpid',
  'campaign_name',
  'campaign_source',
  'campaign_medium',
  'campaign_content',
  'campaign_term',
];

/**
 * Removes tracking parameters from a URL
 * @param url - The URL to clean
 * @returns The cleaned URL without tracking parameters
 */
export function removeTrackingParameters(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove tracking parameters
    TRACKING_PARAMETERS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Return the cleaned URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return the original URL
    console.warn('Failed to parse URL for tracking removal:', error);
    return url;
  }
}

/**
 * Validates if a string is a valid URL
 * @param url - The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by removing tracking parameters and ensuring consistent format
 * @param url - The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  try {
    // First remove tracking parameters
    const cleanedUrl = removeTrackingParameters(url);
    
    // Parse the cleaned URL
    const urlObj = new URL(cleanedUrl);
    
    // Ensure consistent protocol (prefer https)
    if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost' && !urlObj.hostname.startsWith('192.168.') && !urlObj.hostname.startsWith('127.')) {
      urlObj.protocol = 'https:';
    }
    
    // Remove default ports
    if ((urlObj.protocol === 'https:' && urlObj.port === '443') || 
        (urlObj.protocol === 'http:' && urlObj.port === '80')) {
      urlObj.port = '';
    }
    
    // Remove trailing slash if no path
    if (urlObj.pathname === '/' && urlObj.search === '' && urlObj.hash === '') {
      urlObj.pathname = '';
    }
    
    return urlObj.toString();
  } catch (error) {
    // If normalization fails, at least try to remove tracking parameters
    console.warn('Failed to normalize URL, falling back to tracking removal:', error);
    return removeTrackingParameters(url);
  }
}

/**
 * Checks if a URL contains tracking parameters
 * @param url - The URL to check
 * @returns True if tracking parameters are found, false otherwise
 */
export function hasTrackingParameters(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRACKING_PARAMETERS.some(param => urlObj.searchParams.has(param));
  } catch {
    return false;
  }
}

/**
 * Gets the list of tracking parameters that would be removed from a URL
 * @param url - The URL to analyze
 * @returns Array of tracking parameter names found in the URL
 */
export function getTrackingParameters(url: string): string[] {
  try {
    const urlObj = new URL(url);
    return TRACKING_PARAMETERS.filter(param => urlObj.searchParams.has(param));
  } catch {
    return [];
  }
}