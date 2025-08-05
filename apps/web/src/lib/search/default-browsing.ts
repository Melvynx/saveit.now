import { prisma } from "@workspace/database";
import {
  SearchOptions,
  SearchResponse,
  bookmarkToSearchResult,
  buildSpecialFilterConditions,
  getBookmarkOpenCounts,
} from "./search-helpers";

/**
 * Handles default browsing when no search query is provided
 * Shows bookmarks in chronological order (newest first) without star/frequency boost
 */
export async function getDefaultBookmarks({
  userId,
  types = [],
  specialFilters = [],
  limit = 20,
  cursor,
}: Pick<
  SearchOptions,
  "userId" | "types" | "specialFilters" | "limit" | "cursor"
>): Promise<SearchResponse> {
  // Use cursor for database-level pagination with ULID ordering (most efficient)
  const cursorCondition = cursor
    ? {
        id: {
          lt: cursor, // ULID is lexicographically sortable by timestamp
        },
      }
    : {};

  const specialFilterConditions = buildSpecialFilterConditions(specialFilters);

  const recentBookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      ...cursorCondition,
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
      ...specialFilterConditions,
    },
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      preview: true,
      type: true,
      status: true,
      ogImageUrl: true,
      ogDescription: true,
      faviconUrl: true,
      createdAt: true,
      metadata: true,
      starred: true,
      read: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        id: "desc", // Sort by ULID (naturally sorted by creation time) - NEWEST FIRST
      },
    ],
    take: limit + 1,
  });

  const hasMore = recentBookmarks.length > limit;
  const bookmarks = hasMore ? recentBookmarks.slice(0, -1) : recentBookmarks;
  const nextCursor =
    hasMore && bookmarks.length > 0
      ? bookmarks[bookmarks.length - 1]?.id
      : undefined;

  // Get open counts for display purposes (not for sorting)
  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);
  const openCounts = await getBookmarkOpenCounts(userId, bookmarkIds);

  return {
    bookmarks: bookmarks.map((bookmark) => {
      const openCount = openCounts.get(bookmark.id) || 0;
      return bookmarkToSearchResult(
        bookmark,
        0, // No score for default browsing
        "tag",
        undefined,
        openCount,
      );
    }),
    nextCursor,
    hasMore,
  };
}

/**
 * Handles type-only filtering (no query or tags)
 * Shows bookmarks filtered by type in chronological order
 */
export async function getBookmarksByType({
  userId,
  types,
  specialFilters = [],
  limit = 20,
  cursor,
}: Pick<
  SearchOptions,
  "userId" | "types" | "specialFilters" | "limit" | "cursor"
>): Promise<SearchResponse> {
  if (!types || types.length === 0) {
    return getDefaultBookmarks({ userId, specialFilters, limit, cursor });
  }

  // Use cursor for database-level pagination with ULID ordering
  const cursorCondition = cursor
    ? {
        id: {
          lt: cursor,
        },
      }
    : {};

  const specialFilterConditions = buildSpecialFilterConditions(specialFilters);

  const typeFilteredBookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      type: { in: types },
      ...cursorCondition,
      ...specialFilterConditions,
    },
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      preview: true,
      type: true,
      status: true,
      ogImageUrl: true,
      ogDescription: true,
      faviconUrl: true,
      createdAt: true,
      metadata: true,
      starred: true,
      read: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: [
      { id: "desc" }, // Use ULID ordering - NEWEST FIRST
    ],
    take: limit + 1,
  });

  const hasMore = typeFilteredBookmarks.length > limit;
  const bookmarks = hasMore
    ? typeFilteredBookmarks.slice(0, -1)
    : typeFilteredBookmarks;
  const nextCursor =
    hasMore && bookmarks.length > 0
      ? bookmarks[bookmarks.length - 1]?.id
      : undefined;

  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);
  const openCounts = await getBookmarkOpenCounts(userId, bookmarkIds);

  return {
    bookmarks: bookmarks.map((bookmark) => {
      const openCount = openCounts.get(bookmark.id) || 0;
      return bookmarkToSearchResult(
        bookmark,
        0, // No score for type filtering
        "tag",
        undefined,
        openCount,
      );
    }),
    nextCursor,
    hasMore,
  };
}
