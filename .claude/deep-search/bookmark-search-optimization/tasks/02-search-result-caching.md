# Task 2: Search Result Caching

## Objective
Implement Redis-based caching for search results to reduce database load and improve response times

## Priority
🟡 **HIGH** - Implement after database indexes for maximum performance impact

## Problem Statement
Current search implementation:
- Performs expensive database queries on every search
- No caching for popular or repeated searches
- Redundant OpenAI embedding computations
- High latency for complex vector searches

## Technical Specification

### 2.1 Search Cache Strategy
```typescript
interface SearchCacheKey {
  userId: string;
  query: string;
  filters: {
    types?: BookmarkType[];
    tags?: string[];
    special?: SpecialFilter[];
  };
  matchingDistance: number;
}

interface CachedSearchResult {
  bookmarks: SearchResult[];
  hasMore: boolean;
  totalCount: number;
  queryTime: number;
  cachedAt: number;
  ttl: number;
}
```

### 2.2 Cache Implementation
```typescript
// Cache key generation
function generateSearchCacheKey(params: SearchCacheKey): string {
  const { userId, query, filters, matchingDistance } = params;
  const filterHash = createHash('md5')
    .update(JSON.stringify({ types: filters.types?.sort(), tags: filters.tags?.sort(), special: filters.special?.sort() }))
    .digest('hex');

  const queryHash = createHash('md5')
    .update(`${query}:${matchingDistance}`)
    .digest('hex');

  return `search:${userId}:${queryHash}:${filterHash}`;
}

// Cache TTL strategy
function getCacheTTL(resultCount: number, queryComplexity: 'simple' | 'complex'): number {
  if (queryComplexity === 'simple' && resultCount > 0) return 900; // 15 minutes
  if (queryComplexity === 'complex' && resultCount > 0) return 600; // 10 minutes
  if (resultCount === 0) return 300; // 5 minutes for no results
  return 900; // Default 15 minutes
}
```

## Implementation Files

### File 1: Search Cache Service
**Path**: `apps/web/src/lib/search/search-cache.ts`

```typescript
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import type { SearchParams, SearchResponse, SearchResult } from './types';

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

  static async get(params: SearchParams): Promise<CachedSearchResult | null> {
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

      const result: CachedSearchResult = JSON.parse(cached);

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
    params: SearchParams,
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

      // Set with TTL
      await redis.setex(cacheKey, ttl, JSON.stringify(cachedResult));
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

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Search cache invalidation error:', error);
    }
  }

  static async invalidateBookmarkUpdate(userId: string, bookmarkId: string): Promise<void> {
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
      const memory = await redis.memory('usage');

      return {
        totalKeys: keys.length,
        memoryUsage: `${Math.round(memory / 1024 / 1024 * 100) / 100} MB`,
      };
    } catch (error) {
      console.error('Search cache stats error:', error);
      return { totalKeys: 0, memoryUsage: 'Unknown' };
    }
  }
}
```

### File 2: Cache Integration in Search
**Path**: `apps/web/src/lib/search/cached-search.ts`

```typescript
import { SearchCache } from './search-cache';
import { advancedSearch } from './advanced-search';
import type { SearchParams, SearchResponse } from './types';

export async function cachedAdvancedSearch(params: SearchParams): Promise<SearchResponse> {
  const startTime = performance.now();

  // Try to get from cache first
  const cached = await SearchCache.get(params);
  if (cached) {
    console.log(`Cache hit for search query: ${params.query || 'default'}`);
    return {
      bookmarks: cached.bookmarks,
      hasMore: cached.hasMore,
      totalCount: cached.totalCount,
      queryTime: cached.queryTime,
      fromCache: true
    };
  }

  // Cache miss - perform actual search
  console.log(`Cache miss for search query: ${params.query || 'default'}`);
  const result = await advancedSearch(params);
  const queryTime = performance.now() - startTime;

  // Determine query type for appropriate caching strategy
  const queryType = getQueryType(params);

  // Cache the result (fire and forget)
  SearchCache.set(params, result, queryTime, queryType).catch(console.error);

  return {
    ...result,
    queryTime,
    fromCache: false
  };
}

function getQueryType(params: SearchParams): 'default' | 'tag' | 'domain' | 'vector' | 'combined' {
  if (!params.query && !params.tags && !params.types) return 'default';
  if (params.tags && params.tags.length > 0 && !params.query) return 'tag';
  if (params.query && isDomainQuery(params.query)) return 'domain';
  if (params.query && !params.tags && !params.types) return 'vector';
  return 'combined';
}

function isDomainQuery(query: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(query);
}
```

### File 3: Embedding Cache Service
**Path**: `apps/web/src/lib/search/embedding-cache.ts`

```typescript
import { redis } from '@/lib/redis';
import { createHash } from 'crypto';

interface CachedEmbedding {
  embedding: number[];
  model: string;
  cachedAt: number;
}

export class EmbeddingCache {
  private static EMBEDDING_TTL = 7 * 24 * 60 * 60; // 7 days
  private static CACHE_VERSION = 'v1';

  private static generateEmbeddingKey(text: string, model: string): string {
    const textHash = createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex');

    return `embedding:${this.CACHE_VERSION}:${model}:${textHash}`;
  }

  static async get(text: string, model: string = 'text-embedding-3-small'): Promise<number[] | null> {
    try {
      const cacheKey = this.generateEmbeddingKey(text, model);
      const cached = await redis.get(cacheKey);

      if (!cached) return null;

      const result: CachedEmbedding = JSON.parse(cached);

      // Verify model matches (in case we switch embedding models)
      if (result.model !== model) {
        await redis.del(cacheKey);
        return null;
      }

      return result.embedding;
    } catch (error) {
      console.error('Embedding cache get error:', error);
      return null;
    }
  }

  static async set(text: string, embedding: number[], model: string = 'text-embedding-3-small'): Promise<void> {
    try {
      const cacheKey = this.generateEmbeddingKey(text, model);

      const cachedEmbedding: CachedEmbedding = {
        embedding,
        model,
        cachedAt: Date.now()
      };

      await redis.setex(cacheKey, this.EMBEDDING_TTL, JSON.stringify(cachedEmbedding));
    } catch (error) {
      console.error('Embedding cache set error:', error);
    }
  }

  static async getStats(): Promise<{
    totalEmbeddings: number;
    memoryUsage: string;
  }> {
    try {
      const keys = await redis.keys(`embedding:${this.CACHE_VERSION}:*`);
      const memory = await redis.memory('usage');

      return {
        totalEmbeddings: keys.length,
        memoryUsage: `${Math.round(memory / 1024 / 1024 * 100) / 100} MB`
      };
    } catch (error) {
      console.error('Embedding cache stats error:', error);
      return { totalEmbeddings: 0, memoryUsage: 'Unknown' };
    }
  }
}
```

### File 4: Cache Invalidation Hooks
**Path**: `apps/web/src/lib/search/cache-invalidation.ts`

```typescript
import { SearchCache } from './search-cache';
import type { Bookmark } from '@prisma/client';

export class CacheInvalidation {
  /**
   * Invalidate search cache when bookmark is created
   */
  static async onBookmarkCreated(bookmark: Bookmark): Promise<void> {
    await SearchCache.invalidateUserSearches(bookmark.userId);
  }

  /**
   * Invalidate search cache when bookmark is updated
   */
  static async onBookmarkUpdated(bookmark: Bookmark): Promise<void> {
    await SearchCache.invalidateBookmarkUpdate(bookmark.userId, bookmark.id);
  }

  /**
   * Invalidate search cache when bookmark is deleted
   */
  static async onBookmarkDeleted(userId: string, bookmarkId: string): Promise<void> {
    await SearchCache.invalidateBookmarkUpdate(userId, bookmarkId);
  }

  /**
   * Invalidate search cache when tags are updated
   */
  static async onBookmarkTagsUpdated(userId: string, bookmarkId: string): Promise<void> {
    await SearchCache.invalidateUserSearches(userId);
  }

  /**
   * Invalidate search cache when bookmark status changes
   */
  static async onBookmarkStatusChanged(bookmark: Bookmark): Promise<void> {
    // Only invalidate if status changed to/from COMPLETE
    await SearchCache.invalidateUserSearches(bookmark.userId);
  }
}
```

## Integration Points

### 1. Update Main Search API
**Path**: `apps/web/app/api/bookmarks/route.ts`

```typescript
import { cachedAdvancedSearch } from '@/lib/search/cached-search';

// Replace advancedSearch with cachedAdvancedSearch
const result = await cachedAdvancedSearch({
  userId,
  query,
  tags,
  types,
  specialFilters,
  limit,
  cursor,
  matchingDistance
});
```

### 2. Add Cache Invalidation to Bookmark Operations
**Path**: `apps/web/src/lib/inngest/process-bookmark.ts`

```typescript
import { CacheInvalidation } from '@/lib/search/cache-invalidation';

// After bookmark processing
await CacheInvalidation.onBookmarkUpdated(bookmark);
```

### 3. Add OpenAI Embedding Caching
**Path**: `apps/web/src/lib/openai.ts`

```typescript
import { EmbeddingCache } from '@/lib/search/embedding-cache';

export async function getEmbedding(text: string): Promise<number[]> {
  // Try cache first
  const cached = await EmbeddingCache.get(text);
  if (cached) return cached;

  // Generate new embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = response.data[0].embedding;

  // Cache for future use
  await EmbeddingCache.set(text, embedding);

  return embedding;
}
```

## Success Criteria

### Performance Metrics
- [ ] Cache hit rate > 40% for repeated searches
- [ ] Cached search response time < 50ms
- [ ] Database load reduction of 30%+ for search queries
- [ ] OpenAI API calls reduced by 60%+ through embedding caching

### Cache Effectiveness
- [ ] No stale results returned to users
- [ ] Cache invalidation works correctly on bookmark updates
- [ ] Memory usage stays within Redis limits
- [ ] Cache keys are properly distributed (no hotspots)

### Error Handling
- [ ] Search still works if Redis is down
- [ ] No cache corruption on concurrent updates
- [ ] Graceful degradation when cache is full

## Risk Mitigation

### Cache Consistency
- **Risk**: Stale search results after bookmark updates
- **Mitigation**: Aggressive cache invalidation on any bookmark change
- **Monitoring**: Track cache hit rates and user complaints

### Memory Usage
- **Risk**: Redis memory exhaustion from large result sets
- **Mitigation**: TTL-based expiration and result size limits
- **Monitoring**: Redis memory usage alerts

### Redis Availability
- **Risk**: Search breaks if Redis is unavailable
- **Mitigation**: Graceful fallback to direct database queries
- **Testing**: Simulate Redis outages in staging

## Implementation Order

1. **Create cache service classes** (SearchCache, EmbeddingCache)
2. **Add cache integration** to main search function
3. **Implement cache invalidation** hooks
4. **Update OpenAI embedding** with caching
5. **Add monitoring and stats** endpoints
6. **Test cache behavior** thoroughly

## Dependencies
- Redis (Upstash) already configured
- Database indexes from Task 1
- No breaking changes to existing search API

## Estimated Effort
- **Development**: 6-8 hours
- **Testing**: 2-3 hours
- **Integration**: 1-2 hours
- **Total**: 9-13 hours