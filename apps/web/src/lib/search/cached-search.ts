import { SearchCache } from './search-cache';
import { optimizedSearch } from './optimized-search';
import type { SearchOptions, SearchResponse } from './search-helpers';
import { isDomainQuery } from './search-helpers';

export async function cachedAdvancedSearch(params: SearchOptions): Promise<SearchResponse> {
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
  const result = await optimizedSearch(params);
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

function getQueryType(params: SearchOptions): 'default' | 'tag' | 'domain' | 'vector' | 'combined' {
  if (!params.query && !params.tags && !params.types) return 'default';
  if (params.tags && params.tags.length > 0 && !params.query) return 'tag';
  if (params.query && isDomainQuery(params.query)) return 'domain';
  if (params.query && !params.tags && !params.types) return 'vector';
  return 'combined';
}

