import { api } from "@convex/_generated/api";
import { useAuthedQuery } from "@/hooks/use-authed-query";

export const useBookmark = (bookmarkId?: string | null) => {
  const bookmark = useAuthedQuery(
    api.bookmarks.queries.getByIdOrLegacyId,
    bookmarkId ? { id: bookmarkId } : "skip",
  );

  return {
    data: bookmark ? { bookmark } : bookmark === undefined ? undefined : null,
    isLoading: bookmark === undefined,
    isError: false,
    error: null,
    refetch: () => {},
  };
};

export const usePrefetchBookmark = () => {
  return (_bookmarkId?: string | null) => {};
};

export const useRefreshBookmark = (bookmarkId?: string | null) => {
  return () => void bookmarkId;
};

/**
 * Fetches live URL metadata (title, faviconUrl) for a bookmark.
 * Previously this hit /api/bookmarks/{id}/metadata — we now use Convex reactivity
 * from the bookmark itself. Kept as a thin wrapper returning the same shape
 * so call-sites that read .data.title / .data.faviconUrl keep working.
 */
export const useBookmarkMetadata = (bookmarkId?: string | null) => {
  const bookmarkQuery = useBookmark(bookmarkId);

  return {
    ...bookmarkQuery,
    data: bookmarkQuery.data?.bookmark
      ? {
          title: bookmarkQuery.data.bookmark.title ?? "",
          faviconUrl: bookmarkQuery.data.bookmark.faviconUrl ?? "",
        }
      : null,
  };
};
