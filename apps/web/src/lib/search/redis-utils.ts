/**
 * Utility functions for handling Redis responses consistently
 */

/**
 * Safely handles Redis response - Upstash Redis handles serialization automatically
 * @param cached - Raw Redis response (already deserialized by Upstash)
 * @returns Parsed object or null if invalid
 */
export function parseRedisResponse<T>(cached: unknown): T | null {
  if (!cached) return null;

  try {
    // Upstash Redis automatically deserializes objects, so we can cast directly
    return cached as T;
  } catch (error) {
    console.error('Redis response parse error:', error);
    return null;
  }
}