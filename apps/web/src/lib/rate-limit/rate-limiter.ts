import { redis } from "../redis";
import { RateLimitConfig, RateLimitResult, RateLimitHeaders } from "./rate-limit-config";
import { createRateLimitKey } from "./ip-extractor";

/**
 * Rate limiter implementation with sliding window and fixed window support
 */
export class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  /**
   * Check and update rate limit for a given key
   */
  async checkRateLimit(key: string): Promise<RateLimitResult> {
    try {
      if (this.config.windowType === 'sliding') {
        return await this.slidingWindowRateLimit(key);
      } else {
        return await this.fixedWindowRateLimit(key);
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail-open: allow the request if Redis is unavailable
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Sliding window rate limiting using Redis sorted sets
   */
  private async slidingWindowRateLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

    const results = await pipeline.exec();
    
    if (!results || results.length < 4) {
      throw new Error('Pipeline execution failed');
    }

    // Get count before adding current request
    const currentCount = (results[1] as [string | null, number] | null)?.[1] || 0;
    const newCount = currentCount + 1;

    const success = newCount <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - newCount);
    const resetTime = now + this.config.windowMs;

    // If limit exceeded, remove the request we just added
    if (!success) {
      await redis.zremrangebyrank(key, -1, -1);
    }

    return {
      success,
      limit: this.config.maxRequests,
      remaining,
      resetTime,
      retryAfter: success ? undefined : Math.ceil(this.config.windowMs / 1000),
    };
  }

  /**
   * Fixed window rate limiting using Redis strings with expiration
   */
  private async fixedWindowRateLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;
    const resetTime = windowStart + this.config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Increment counter
    pipeline.incr(windowKey);
    
    // Set expiration if this is the first request in window
    pipeline.expire(windowKey, Math.ceil(this.config.windowMs / 1000));

    const results = await pipeline.exec();
    
    if (!results || results.length < 2) {
      throw new Error('Pipeline execution failed');
    }

    const currentCount = (results[0] as [string | null, number] | null)?.[1] || 1;
    const success = currentCount <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);

    return {
      success,
      limit: this.config.maxRequests,
      remaining,
      resetTime,
      retryAfter: success ? undefined : Math.ceil((resetTime - now) / 1000),
    };
  }

  /**
   * Generate rate limit headers for HTTP responses
   */
  static createHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    };

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }
}

/**
 * Convenience function to check multiple rate limits
 */
export async function checkMultipleRateLimits(
  ip: string,
  configs: RateLimitConfig[]
): Promise<RateLimitResult[]> {
  const promises = configs.map(config => {
    const limiter = new RateLimiter(config);
    const rateLimitKey = createRateLimitKey(ip, config.keyPrefix);
    return limiter.checkRateLimit(rateLimitKey);
  });

  return await Promise.all(promises);
}

/**
 * Check if any rate limit failed
 */
export function hasRateLimitFailure(results: RateLimitResult[]): boolean {
  return results.some(result => !result.success);
}

/**
 * Find the most restrictive rate limit result
 */
export function getMostRestrictiveResult(results: RateLimitResult[]): RateLimitResult {
  return results.reduce((mostRestrictive, current) => {
    if (!current.success) {
      if (!mostRestrictive.success) {
        // Both failed, return the one with shorter retry time
        return (current.retryAfter || 0) < (mostRestrictive.retryAfter || 0) 
          ? current 
          : mostRestrictive;
      }
      return current;
    }
    if (!mostRestrictive.success) {
      return mostRestrictive;
    }
    // Both succeeded, return the one with fewer remaining requests
    return current.remaining < mostRestrictive.remaining ? current : mostRestrictive;
  });
}