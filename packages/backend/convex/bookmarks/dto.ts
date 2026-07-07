/**
 * Bookmark DTO types and mapper helpers.
 * Pure TypeScript — no Convex function registrations.
 */

import type { Id } from "../_generated/dataModel";
import {
  cleanMetadata,
  cleanMetadataForStorage,
  cleanPublicMetadata,
} from "../utils/metadata";

export { cleanMetadata, cleanMetadataForStorage, cleanPublicMetadata };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type TagInBookmark = {
  tag: {
    id: string;
    name: string;
    type: string;
  };
};

export type TagDTO = {
  _id: Id<"tags">;
  id: string;
  name: string;
  type: "USER" | "IA";
};

export type TagManagementDTO = TagDTO & {
  _count: { bookmarks: number };
};

export type BookmarkDTO = {
  _id: Id<"bookmarks">;
  id: string;
  legacyId?: string | null;
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
  matchType: "tag" | "vector" | "combined" | "default";
  matchedTags: string[];
  tags: TagInBookmark[];
  createdAt: number;
  metadata: Record<string, unknown> | null;
  openCount: number;
  starred: boolean;
  read: boolean;
  processingError: string | null;
  processingStep: number | null;
};

export type BookmarkDetailDTO = BookmarkDTO & {
  note: string | null;
  userId: string;
  vectorSummary: string | null;
  updatedAt: number;
  processingStep: number | null;
};

export type PublicBookmarkDTO = {
  id: string;
  legacyId?: string | null;
  url: string;
  title: string | null;
  type: BookmarkType | null;
  summary: string | null;
  preview: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogDescription: string | null;
  createdAt: number;
  status: BookmarkStatus;
  starred: false;
  read: false;
  matchedTags: string[];
  metadata: Record<string, unknown> | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal raw doc shapes (subset — callers supply these from DB reads)
// ---------------------------------------------------------------------------

type RawBookmark = {
  _id: Id<"bookmarks">;
  legacyId?: string | null;
  userId: string;
  url: string;
  type?: BookmarkType;
  title?: string;
  summary?: string;
  note?: string;
  preview?: string;
  vectorSummary?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  ogDescription?: string;
  metadata?: unknown;
  status: BookmarkStatus;
  starred: boolean;
  read: boolean;
  processingStep?: number;
  processingError?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Maps a raw bookmark doc + resolved tags into a `BookmarkDTO`.
 * Score/matchType/matchedTags are for browsing (not search); set defaults here.
 */
export function buildBookmarkDTO(
  bookmark: RawBookmark,
  tags: TagInBookmark[],
  openCount = 0,
): BookmarkDTO {
  return {
    _id: bookmark._id,
    id: bookmark._id,
    ...(bookmark.legacyId ? { legacyId: bookmark.legacyId } : {}),
    url: bookmark.url,
    title: bookmark.title ?? null,
    summary: bookmark.summary ?? null,
    preview: bookmark.preview ?? null,
    type: bookmark.type ?? null,
    status: bookmark.status,
    ogImageUrl: bookmark.ogImageUrl ?? null,
    ogDescription: bookmark.ogDescription ?? null,
    faviconUrl: bookmark.faviconUrl ?? null,
    score: 0,
    matchType: "default",
    matchedTags: [],
    tags,
    createdAt: bookmark.createdAt,
    metadata: cleanMetadata(bookmark.metadata) ?? null,
    openCount,
    starred: bookmark.starred,
    read: bookmark.read,
    processingError: bookmark.processingError ?? null,
    processingStep: bookmark.processingStep ?? null,
  };
}

/**
 * Maps a raw bookmark doc + tags into a `BookmarkDetailDTO` (adds private fields).
 */
export function buildBookmarkDetailDTO(
  bookmark: RawBookmark,
  tags: TagInBookmark[],
  openCount = 0,
): BookmarkDetailDTO {
  return {
    ...buildBookmarkDTO(bookmark, tags, openCount),
    note: bookmark.note ?? null,
    userId: bookmark.userId,
    vectorSummary: bookmark.vectorSummary ?? null,
    updatedAt: bookmark.updatedAt,
    processingStep: bookmark.processingStep ?? null,
  };
}

/**
 * Maps a raw bookmark doc into a `PublicBookmarkDTO` (whitelist only).
 * `starred` and `read` are always forced to `false`. Never includes `note`,
 * `userId`, `vectorSummary`, `searchEmbedding`, etc.
 */
export function buildPublicBookmarkDTO(
  bookmark: RawBookmark,
): PublicBookmarkDTO {
  return {
    id: bookmark._id,
    ...(bookmark.legacyId ? { legacyId: bookmark.legacyId } : {}),
    url: bookmark.url,
    title: bookmark.title ?? null,
    type: bookmark.type ?? null,
    summary: bookmark.summary ?? null,
    preview: bookmark.preview ?? null,
    faviconUrl: bookmark.faviconUrl ?? null,
    ogImageUrl: bookmark.ogImageUrl ?? null,
    ogDescription: bookmark.ogDescription ?? null,
    createdAt: bookmark.createdAt,
    status: bookmark.status,
    starred: false,
    read: false,
    matchedTags: [],
    metadata: cleanPublicMetadata(bookmark.metadata) ?? null,
  };
}
