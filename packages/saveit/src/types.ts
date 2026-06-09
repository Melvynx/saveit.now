/** SaveIt.now public types - mirrored from the v1 REST API. */

export type BookmarkType =
  | "VIDEO"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "YOUTUBE"
  | "TWEET"
  | "PDF"
  | "PRODUCT";

export type BookmarkStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";

export type SpecialFilter = "READ" | "UNREAD" | "STAR";

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  type: BookmarkType | null;
  status: BookmarkStatus;
  starred: boolean;
  read: boolean;
  preview?: string | null;
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
  ogDescription?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
  matchedTags?: string[];
  score?: number;
  matchType?: string;
}

export interface Tag {
  id: string;
  name: string;
  type: string;
  bookmarkCount: number;
}

export interface ListBookmarksOptions {
  query?: string;
  tags?: string[];
  types?: BookmarkType[];
  special?: SpecialFilter;
  limit?: number;
  cursor?: string;
  /** Vector match distance, between 0.1 and 2.0. Default 0.3. */
  matchingDistance?: number;
}

export interface ListBookmarksResult {
  bookmarks: Bookmark[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CreateBookmarkInput {
  url: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface ListTagsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListTagsResult {
  tags: Tag[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RandomBookmarkResult {
  /** The bookmark, or `null` when the user has opened every available bookmark. */
  bookmark: (Bookmark & { tags?: string[] }) | null;
  remaining: number;
  /** `true` when no unopened bookmarks are left. `bookmark` is `null` in that case. */
  exhausted: boolean;
}

export interface SaveitOptions {
  /** API key issued from https://saveit.now/account/keys. Falls back to `SAVEIT_API_KEY`. */
  apiKey?: string;
  /** Override the API base URL. Defaults to `SAVEIT_BASE_URL` or `https://saveit.now/api/v1`. */
  baseUrl?: string;
  /** Custom fetch implementation (defaults to global `fetch`). */
  fetch?: typeof fetch;
  /** Per-request timeout in milliseconds. Default 30s. */
  timeoutMs?: number;
  /** Number of retries for GET requests on network errors, 429, or 5xx. Default 3. */
  maxRetries?: number;
}
