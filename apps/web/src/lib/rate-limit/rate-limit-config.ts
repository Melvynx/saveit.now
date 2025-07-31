export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  windowType: 'sliding' | 'fixed';
}

export const RATE_LIMITS = {
  OG_IMAGES: {
    PER_MINUTE: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      keyPrefix: 'og-images:minute',
      windowType: 'sliding' as const,
    },
    PER_HOUR: {
      windowMs: 60 * 60 * 1000, // 1 hour  
      maxRequests: 100,
      keyPrefix: 'og-images:hour',
      windowType: 'fixed' as const,
    },
  },
} as const;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
  [key: string]: string | undefined;
}