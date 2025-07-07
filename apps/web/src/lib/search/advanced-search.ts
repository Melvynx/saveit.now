import {
  SearchOptions,
  SearchResponse,
  isSearchQuery,
} from "./search-helpers";
import { getDefaultBookmarks, getBookmarksByType } from "./default-browsing";
import { performMultiLevelSearch, applySearchPagination } from "./search-combiners";

// Re-export types for backward compatibility
export type {
  SearchResultChunk,
  SearchResult,
  SearchResponse,
  SearchOptions,
  SearchByVectorOptions,
  SearchByTagsOptions,
  SearchByDomainOptions,
} from "./search-helpers";

/**
 * Performs advanced multi-level search in bookmarks
 * 
 * This function intelligently routes between different search strategies:
 * - Default browsing: Shows newest bookmarks first (no star/frequency boost)
 * - Search queries: Uses full search with star/frequency boost for relevance
 */
export async function advancedSearch({
  userId,
  query = "",
  tags = [],
  types = [],
  limit = 20,
  cursor,
  matchingDistance = 0.1,
}: SearchOptions): Promise<SearchResponse> {
  // Determine if this is a search query or default browsing
  const isSearch = isSearchQuery(query, tags, types);
  
  if (!isSearch) {
    // Default browsing - show newest bookmarks first
    return await getDefaultBookmarks({ userId, types, limit, cursor });
  }
  
  // Handle type-only filtering (no query or tags)
  if (
    types &&
    types.length > 0 &&
    (!query || query.trim() === "") &&
    (!tags || tags.length === 0)
  ) {
    return await getBookmarksByType({ userId, types, limit, cursor });
  }
  
  // Perform search with query
  const searchResults = await performMultiLevelSearch({
    userId,
    query: query.trim(),
    tags,
    types,
    matchingDistance,
  });
  
  // Apply pagination to search results
  const paginatedResults = applySearchPagination(searchResults, cursor, limit);
  
  return paginatedResults;
}

