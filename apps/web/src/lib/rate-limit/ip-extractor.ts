import { NextRequest } from "next/server";

/**
 * Extracts the client IP address from a NextRequest
 * Handles various proxy headers and fallbacks
 */
export function extractClientIP(request: NextRequest): string {
  // Try to get IP from various headers (in order of preference)
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of possibleHeaders) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0]?.trim();
      if (ip && isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to the request IP (may not be available in all environments)
  // Note: request.ip is not always available in NextRequest
  // This is a fallback that may not work in all deployment environments

  // Last resort fallback
  return 'unknown';
}

/**
 * Basic IP validation (supports both IPv4 and IPv6)
 */
function isValidIP(ip: string): boolean {
  // Remove any surrounding brackets (IPv6)
  const cleanIP = ip.replace(/^\[|\]$/g, '');
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(cleanIP) || ipv6Regex.test(cleanIP);
}

/**
 * Creates a rate limit key for a specific IP and resource
 */
export function createRateLimitKey(ip: string, keyPrefix: string): string {
  // Hash the IP for privacy and consistent key length
  const hashedIP = hashIP(ip);
  return `${keyPrefix}:${hashedIP}`;
}

/**
 * Simple hash function for IP addresses to maintain privacy
 */
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}