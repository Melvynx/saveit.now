import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { parseRedisResponse } from './redis-utils';
import type { SearchOptions, SearchResponse, SearchResult } from './search-helpers';

interface SearchCacheKey {
  userId: string;
  query: string;
  filters: {
    types?: string[];
    tags?: string[];
    special?: string[];
  };
  matchingDistance: number;
  cursor?: string;
  limit: number;
}

interface CachedSearchResult {
  bookmarks: SearchResult[];
  hasMore: boolean;
  totalCount?: number;
  queryTime: number;
  cachedAt: number;
  ttl: number;
}

export class SearchCache {
  private static generateCacheKey(params: SearchCacheKey): string {
    const { userId, query, filters, matchingDistance, cursor, limit } = params;

    // Normalize filters for consistent hashing
    const normalizedFilters = {
      types: filters.types?.sort(),
      tags: filters.tags?.sort(),
      special: filters.special?.sort()
    };

    const filterHash = createHash('md5')
      .update(JSON.stringify(normalizedFilters))
      .digest('hex').substring(0, 8);

    const queryHash = createHash('md5')
      .update(`${query}:${matchingDistance}:${cursor}:${limit}`)
      .digest('hex').substring(0, 8);

    return `search:v2:${userId}:${queryHash}:${filterHash}`;
  }

  private static getCacheTTL(
    resultCount: number,
    queryType: 'default' | 'tag' | 'domain' | 'vector' | 'combined'
  ): number {
    // Different TTL based on query complexity and results
    if (resultCount === 0) return 300; // 5 minutes for no results

    switch (queryType) {
      case 'default':
        return 1800; // 30 minutes for default browsing
      case 'tag':
        return 900;  // 15 minutes for tag searches
      case 'domain':
        return 1200; // 20 minutes for domain searches
      case 'vector':
        return 600;  // 10 minutes for vector searches (more dynamic)
      case 'combined':
        return 450;  // 7.5 minutes for complex combined searches
      default:
        return 900;  // 15 minutes default
    }
  }

  static async get(params: SearchOptions): Promise<CachedSearchResult | null> {
    try {
      const cacheKey = this.generateCacheKey({
        userId: params.userId,
        query: params.query || '',
        filters: {
          types: params.types,
          tags: params.tags,
          special: params.specialFilters
        },
        matchingDistance: params.matchingDistance || 0.1,
        cursor: params.cursor,
        limit: params.limit || 20
      });

      const cached = await redis.get(cacheKey);
      if (!cached) return null;

      const result = parseRedisResponse<CachedSearchResult>(cached);
      if (!result) return null;

      // Check if cache is still valid
      const now = Date.now();
      if (now - result.cachedAt > result.ttl * 1000) {
        // Cache expired, delete it
        await redis.del(cacheKey);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Search cache get error:', error);
      return null; // Fail gracefully
    }
  }

  static async set(
    params: SearchOptions,
    result: SearchResponse,
    queryTime: number,
    queryType: 'default' | 'tag' | 'domain' | 'vector' | 'combined' = 'combined'
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey({
        userId: params.userId,
        query: params.query || '',
        filters: {
          types: params.types,
          tags: params.tags,
          special: params.specialFilters
        },
        matchingDistance: params.matchingDistance || 0.1,
        cursor: params.cursor,
        limit: params.limit || 20
      });

      const ttl = this.getCacheTTL(result.bookmarks.length, queryType);

      const cachedResult: CachedSearchResult = {
        bookmarks: result.bookmarks,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        queryTime,
        cachedAt: Date.now(),
        ttl
      };

      // Set with TTL - Upstash Redis handles serialization automatically
      await redis.setex(cacheKey, ttl, cachedResult);
    } catch (error) {
      console.error('Search cache set error:', error);
      // Fail gracefully - don't break search if caching fails
    }
  }

  static async invalidateUserSearches(userId: string): Promise<void> {
    try {
      // Find all cache keys for this user
      const pattern = `search:v2:${userId}:*`;
      const keys = await redis.keys(pattern);

      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Search cache invalidation error:', error);
    }
  }

  static async invalidateBookmarkUpdate(userId: string): Promise<void> {
    // For now, invalidate all user searches when a bookmark is updated
    // TODO: More granular invalidation based on bookmark content
    await this.invalidateUserSearches(userId);
  }

  static async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const keys = await redis.keys('search:v2:*');

      return {
        totalKeys: keys.length,
        memoryUsage: 'N/A',
      };
    } catch (error) {
      console.error('Search cache stats error:', error);
      return { totalKeys: 0, memoryUsage: 'Unknown' };
    }
  }
}