import { useAuthedQuery } from "@/hooks/use-authed-query";
import type { BookmarkType, BookmarkStatus } from "@/lib/bookmark-types";
import { api } from "@convex/_generated/api";
import { useMemo } from "react";

export type PaletteBookmark = {
  id: string;
  url: string;
  title: string | null;
  type: BookmarkType | null;
  status: BookmarkStatus;
  faviconUrl: string | null;
};

type ListPage = { page?: PaletteBookmark[] } | undefined;

function toPaletteBookmarks(result: ListPage): PaletteBookmark[] | undefined {
  return result?.page?.map((bookmark) => ({
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    type: bookmark.type,
    status: bookmark.status,
    faviconUrl: bookmark.faviconUrl,
  }));
}

/**
 * Bookmarks for the palette "Recent" group: recently opened first, newest
 * saved bookmarks when the user has not opened anything yet.
 */
export function useRecentlyOpened({
  limit = 6,
  enabled = true,
}: { limit?: number; enabled?: boolean } = {}) {
  const opened = useAuthedQuery(
    api.bookmarks.queries.recentlyOpened,
    enabled ? { limit } : "skip",
  ) as PaletteBookmark[] | undefined;
  const newest = useAuthedQuery(
    api.bookmarks.queries.list,
    enabled && opened?.length === 0
      ? { paginationOpts: { numItems: limit, cursor: null } }
      : "skip",
  ) as ListPage;

  return useMemo(() => {
    if (opened === undefined) return undefined;
    if (opened.length > 0) return toPaletteBookmarks({ page: opened });
    return toPaletteBookmarks(newest)?.slice(0, limit);
  }, [opened, newest, limit]);
}

/** Recent slice of the library the palette filters client-side by title/url. */
export function usePaletteBookmarks({ enabled }: { enabled: boolean }) {
  const result = useAuthedQuery(
    api.bookmarks.queries.list,
    enabled ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  ) as ListPage;

  return useMemo(() => toPaletteBookmarks(result), [result]);
}
