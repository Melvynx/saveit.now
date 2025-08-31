import { BookmarkType } from "@workspace/database";
import {
  SearchResult,
  isDomainQuery,
  extractDomain,
  sortSearchResults,
  paginateResults,
  getBookmarkOpenCounts,
  applyOpenFrequencyBoost,
} from "./search-helpers";
import { searchByDomain, searchByTags, searchByText } from "./search-by-query";

/**
 * Combines search results from multiple sources with proper deduplication
 */
export class SearchResultCombiner {
  private resultMap = new Map<string, SearchResult>();

  /**
   * Adds results from tag search
   */
  addTagResults(results: SearchResult[], boost: number = 1.5): void {
    for (const result of results) {
      this.resultMap.set(result.id, {
        ...result,
        score: result.score * boost,
        matchType: "tag",
      });
    }
  }

  /**
   * Adds results from domain search
   */
  addDomainResults(results: SearchResult[]): void {
    for (const result of results) {
      if (this.resultMap.has(result.id)) {
        const existing = this.resultMap.get(result.id)!;
        this.resultMap.set(result.id, {
          ...existing,
          score: existing.score + result.score,
          matchType: "combined",
        });
      } else {
        this.resultMap.set(result.id, {
          ...result,
          matchType: "tag", // Domain searches are treated as tag searches
        });
      }
    }
  }

  /**
   * Adds results from vector search
   */
  addVectorResults(results: SearchResult[], boost: number = 0.6): void {
    for (const result of results) {
      if (this.resultMap.has(result.id)) {
        const existing = this.resultMap.get(result.id)!;
        this.resultMap.set(result.id, {
          ...existing,
          score: existing.score + result.score * boost,
          matchType: "combined",
        });
      } else {
        this.resultMap.set(result.id, {
          ...result,
          matchType: "vector",
        });
      }
    }
  }

  /**
   * Applies final scoring adjustments and returns sorted results
   */
  async getFinalResults(userId: string): Promise<SearchResult[]> {
    const allResults = Array.from(this.resultMap.values());

    if (allResults.length === 0) {
      return [];
    }

    // Apply open frequency boost to all results
    const bookmarkIds = allResults.map((result) => result.id);
    const openCounts = await getBookmarkOpenCounts(userId, bookmarkIds);

    for (const result of allResults) {
      const openCount = openCounts.get(result.id) || 0;
      result.openCount = openCount;
      result.score = applyOpenFrequencyBoost(result.score, openCount);
    }

    return sortSearchResults(allResults);
  }

  /**
   * Gets the number of unique results
   */
  getResultCount(): number {
    return this.resultMap.size;
  }

  /**
   * Clears all results
   */
  clear(): void {
    this.resultMap.clear();
  }
}

/**
 * Performs a comprehensive search combining multiple search strategies
 */
export async function performMultiLevelSearch({
  userId,
  query,
  tags = [],
  types,
  specialFilters = [],
  matchingDistance = 0.1,
}: {
  userId: string;
  query: string;
  tags?: string[];
  types?: BookmarkType[];
  specialFilters?: ("READ" | "UNREAD" | "STAR")[];
  matchingDistance?: number;
}): Promise<SearchResult[]> {
  const combiner = new SearchResultCombiner();

  // Level 1: Search by tags if provided
  if (tags && tags.length > 0) {
    const tagResults = await searchByTags({
      userId,
      tags,
      types,
      specialFilters,
    });
    combiner.addTagResults(tagResults);
  }

  // Level 2: Check if query is a domain search
  if (isDomainQuery(query)) {
    const domain = extractDomain(query);
    const domainResults = await searchByDomain({
      userId,
      domain,
      types,
      specialFilters,
    });
    combiner.addDomainResults(domainResults);
  }

  // Level 3: Vector search using text embedding
  const vectorResults = await searchByText({
    userId,
    query,
    tags,
    types,
    specialFilters,
    matchingDistance,
  });
  combiner.addVectorResults(vectorResults);

  return await combiner.getFinalResults(userId);
}

/**
 * Applies pagination to search results
 */
export function applySearchPagination(
  results: SearchResult[],
  cursor?: string,
  limit: number = 20,
): {
  bookmarks: SearchResult[];
  nextCursor?: string;
  hasMore: boolean;
} {
  return paginateResults(results, cursor, limit);
}
