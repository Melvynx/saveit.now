/**
 * search/helpers.ts — Pure TypeScript helpers for the search module.
 * No Convex function registrations. No runtime-specific imports.
 */

// ---------------------------------------------------------------------------
// Types (mirrored from Contract §C — SearchResultDTO = BookmarkDTO with score)
// ---------------------------------------------------------------------------

export type SearchResultMatchType = "tag" | "vector" | "combined" | "default";

export type SearchResultDTO = {
  _id: string;
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  preview: string | null;
  type: string | null;
  status: string;
  ogImageUrl: string | null;
  ogDescription: string | null;
  faviconUrl: string | null;
  score: number;
  matchType: SearchResultMatchType;
  matchedTags: string[];
  tags: Array<{ tag: { id: string; name: string; type: string } }>;
  createdAt: number;
  metadata: Record<string, unknown> | null;
  openCount: number;
  starred: boolean;
  read: boolean;
};

// ---------------------------------------------------------------------------
// Domain query detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the query looks like a bare domain name or a URL.
 *
 * Ported verbatim from apps/web/src/lib/search/search-helpers.ts.
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
 * Strips protocol, www., path and query-string from a URL / domain query.
 *
 * Ported verbatim from apps/web/src/lib/search/search-helpers.ts.
 */
export function extractDomain(query: string): string {
  let domain = query.trim().toLowerCase();

  // Strip protocol
  domain = domain.replace(/^https?:\/\//, "");
  // Strip www.
  domain = domain.replace(/^www\./, "");
  // Strip path
  domain = domain.split("/")[0] || domain;
  // Strip query string
  domain = domain.split("?")[0] || domain;
  // Strip fragment
  domain = domain.split("#")[0] || domain;

  return domain;
}

// ---------------------------------------------------------------------------
// isSearchQuery
// ---------------------------------------------------------------------------

/**
 * Returns true only when query is a non-empty, non-whitespace string.
 * An absent or empty string means the user is just browsing their feed.
 */
export function isSearchQuery(query?: string): boolean {
  return Boolean(query && query.trim() !== "");
}

// ---------------------------------------------------------------------------
// Open-frequency boost (Contract §6)
// ---------------------------------------------------------------------------

/**
 * Adds a logarithmic boost proportional to how many times the bookmark has
 * been opened.  Formula is verbatim from Spec 05 §6:
 *   score + Math.log(openCount + 1) * 10
 */
export function applyOpenFrequencyBoost(
  score: number,
  openCount: number,
): number {
  if (openCount === 0) return score;
  const boost = Math.log(openCount + 1) * 10;
  return score + boost;
}

// ---------------------------------------------------------------------------
// Sort & paginate
// ---------------------------------------------------------------------------

/**
 * Stable descending sort: primary key = score desc, secondary = id desc
 * (ULID ids sort lexicographically by time).
 */
export function sortSearchResults(
  results: SearchResultDTO[],
): SearchResultDTO[] {
  return [...results].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.id.localeCompare(a.id);
  });
}

/**
 * ID-cursor pagination over a pre-sorted in-memory result array.
 *
 * Ported verbatim from apps/web/src/lib/search/search-helpers.ts paginateResults.
 */
export function paginateResults(
  results: SearchResultDTO[],
  cursor?: string,
  limit = 20,
): {
  bookmarks: SearchResultDTO[];
  nextCursor?: string;
  hasMore: boolean;
} {
  let startIndex = 0;

  if (cursor) {
    const cursorIndex = results.findIndex((r) => r.id === cursor);
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

  return { bookmarks, nextCursor, hasMore };
}

// ---------------------------------------------------------------------------
// Metadata cleaning (Contract §C, E.11)
// ---------------------------------------------------------------------------

/**
 * Strips the `transcript` field from metadata before sending to clients.
 * YouTube transcripts can be very large.
 */
export function cleanMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { transcript: _, ...cleaned } = metadata as Record<string, unknown>;
  return cleaned;
}

// ---------------------------------------------------------------------------
// bookmarkToSearchResult
// ---------------------------------------------------------------------------

/**
 * Maps a raw bookmark document (with tags already joined) plus a computed
 * score/matchType into a SearchResultDTO that clients can consume.
 */
export function bookmarkToSearchResult(
  bookmark: {
    _id: string;
    userId: string;
    url: string;
    title?: string | null;
    summary?: string | null;
    preview?: string | null;
    type?: string | null;
    status: string;
    ogImageUrl?: string | null;
    ogDescription?: string | null;
    faviconUrl?: string | null;
    createdAt: number;
    metadata?: any;
    starred: boolean;
    read: boolean;
    tags?: Array<{ tag: { id: string; name: string; type: string } }>;
  },
  score: number,
  matchType: SearchResultMatchType,
  matchedTags: string[] = [],
  openCount = 0,
): SearchResultDTO {
  return {
    _id: bookmark._id,
    id: bookmark._id,
    url: bookmark.url,
    title: bookmark.title ?? null,
    summary: bookmark.summary ?? null,
    preview: bookmark.preview ?? null,
    type: bookmark.type ?? null,
    status: bookmark.status,
    ogImageUrl: bookmark.ogImageUrl ?? null,
    ogDescription: bookmark.ogDescription ?? null,
    faviconUrl: bookmark.faviconUrl ?? null,
    score,
    matchType,
    matchedTags,
    tags: bookmark.tags ?? [],
    createdAt: bookmark.createdAt,
    metadata: cleanMetadata(bookmark.metadata) ?? null,
    openCount,
    starred: bookmark.starred,
    read: bookmark.read,
  };
}
