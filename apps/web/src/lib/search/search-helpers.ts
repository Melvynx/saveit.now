import {
  BookmarkStatus,
  BookmarkType,
  prisma,
  Prisma,
} from "@workspace/database";

// Types for search results
export type SearchResultChunk = {
  id: string;
  content: string;
  distance: number;
};

export type SearchResult = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  preview: string | null;
  type: BookmarkType | null;
  status: BookmarkStatus;
  ogImageUrl: string | null;
  ogDescription: string | null;
  faviconUrl: string | null;
  score: number;
  matchType: "tag" | "vector" | "combined";
  matchedTags?: string[];
  createdAt?: Date;
  metadata?: Prisma.JsonValue;
  openCount?: number;
  starred?: boolean;
  read?: boolean;
};

export type SearchResponse = {
  bookmarks: SearchResult[];
  nextCursor?: string;
  hasMore: boolean;
};

// Search options types
export type SearchOptions = {
  userId: string;
  query?: string;
  tags?: string[];
  types?: BookmarkType[];
  limit?: number;
  cursor?: string;
  matchingDistance?: number;
};

export type SearchByVectorOptions = {
  userId: string;
  embedding: number[];
  tags: string[];
  types?: BookmarkType[];
  matchingDistance: number;
};

export type SearchByTagsOptions = {
  userId: string;
  tags: string[];
  types?: BookmarkType[];
};

export type SearchByDomainOptions = {
  userId: string;
  domain: string;
  types?: BookmarkType[];
};

/**
 * Detects if a query is a domain search
 */
export function isDomainQuery(query: string): boolean {
  const cleanQuery = query.trim().toLowerCase();

  const domainPatterns = [
    /^[a-z0-9.-]+\.[a-z]{2,}$/i, // domain.com
    /^www\.[a-z0-9.-]+\.[a-z]{2,}$/i, // www.domain.com
    /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i, // http(s)://domain.com
  ];

  return domainPatterns.some((pattern) => pattern.test(cleanQuery));
}

/**
 * Extracts domain from a query string
 */
export function extractDomain(query: string): string {
  let domain = query.trim().toLowerCase();

  // Remove protocol
  domain = domain.replace(/^https?:\/\//, "");

  // Remove www.
  domain = domain.replace(/^www\./, "");

  // Remove path and parameters
  domain = domain.split("/")[0] || domain;
  domain = domain.split("?")[0] || domain;
  domain = domain.split("#")[0] || domain;

  return domain;
}

/**
 * Retrieves open counts for bookmarks
 */
export async function getBookmarkOpenCounts(
  userId: string,
  bookmarkIds: string[],
): Promise<Map<string, number>> {
  if (bookmarkIds.length === 0) return new Map();

  const openCounts = await prisma.bookmarkOpen.groupBy({
    by: ["bookmarkId"],
    where: {
      userId,
      bookmarkId: { in: bookmarkIds },
    },
    _count: {
      id: true,
    },
  });

  return new Map(
    openCounts.map((count: { bookmarkId: string; _count: { id: number } }) => [
      count.bookmarkId,
      count._count.id,
    ]),
  );
}

/**
 * Applies boost based on open frequency (for search results only)
 */
export function applyOpenFrequencyBoost(score: number, openCount: number): number {
  if (openCount === 0) return score;

  // Logarithmic boost to prevent heavily opened bookmarks from dominating
  const boost = Math.log(openCount + 1) * 10;
  return score + boost;
}

/**
 * Determines if the current request is a search query or default browsing
 */
export function isSearchQuery(query?: string, tags?: string[], types?: BookmarkType[]): boolean {
  const hasQuery = query && query.trim() !== "";
  const hasTags = tags && tags.length > 0;
  const hasTypes = types && types.length > 0;
  
  return !!(hasQuery || hasTags || hasTypes);
}

/**
 * Converts a bookmark from database to SearchResult format
 */
export function bookmarkToSearchResult(
  bookmark: {
    id: string;
    url: string;
    title: string | null;
    summary: string | null;
    preview: string | null;
    type: BookmarkType | null;
    status: BookmarkStatus;
    ogImageUrl: string | null;
    ogDescription: string | null;
    faviconUrl: string | null;
    createdAt: Date;
    metadata: Prisma.JsonValue;
    starred: boolean | null;
    read: boolean | null;
  },
  score: number = 0,
  matchType: "tag" | "vector" | "combined" = "tag",
  matchedTags?: string[],
  openCount?: number,
): SearchResult {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    summary: bookmark.summary,
    preview: bookmark.preview,
    type: bookmark.type,
    status: bookmark.status,
    ogImageUrl: bookmark.ogImageUrl,
    ogDescription: bookmark.ogDescription,
    faviconUrl: bookmark.faviconUrl,
    score,
    matchType,
    matchedTags,
    createdAt: bookmark.createdAt,
    metadata: bookmark.metadata,
    openCount,
    starred: bookmark.starred,
    read: bookmark.read,
  };
}

/**
 * Sorts search results by score (desc) and then by ID (desc) for stable pagination
 */
export function sortSearchResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    // Primary sort: score descending
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Secondary sort: id descending (ULID sorting for stable pagination)
    return b.id.localeCompare(a.id);
  });
}

/**
 * Applies cursor-based pagination to sorted results
 */
export function paginateResults(
  results: SearchResult[],
  cursor?: string,
  limit: number = 20,
): {
  bookmarks: SearchResult[];
  nextCursor?: string;
  hasMore: boolean;
} {
  let startIndex = 0;
  
  if (cursor) {
    const cursorIndex = results.findIndex((result) => result.id === cursor);
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginatedResults = results.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedResults.length > limit;
  const bookmarks = hasMore ? paginatedResults.slice(0, -1) : paginatedResults;
  const nextCursor =
    hasMore && bookmarks.length > 0
      ? bookmarks[bookmarks.length - 1]?.id
      : undefined;

  return {
    bookmarks,
    nextCursor,
    hasMore,
  };
}