import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Id } from "@convex/_generated/dataModel";

export const useBookmark = (bookmarkId?: string | null) => {
  const query = useQuery({
    ...convexQuery(
      api.bookmarks.queries.get,
      bookmarkId ? { id: bookmarkId as Id<"bookmarks"> } : "skip",
    ),
    enabled: !!bookmarkId,
    select: (data) => (data ? { bookmark: data } : null),
  });

  return query;
};

export const usePrefetchBookmark = () => {
  const queryClient = useQueryClient();

  const prefetch = (bookmarkId?: string | null) => {
    if (!bookmarkId) {
      return;
    }
    void queryClient.prefetchQuery(
      convexQuery(api.bookmarks.queries.get, { id: bookmarkId as Id<"bookmarks"> }),
    );
  };

  return prefetch;
};

export const useRefreshBookmark = (bookmarkId?: string | null) => {
  const queryClient = useQueryClient();

  const refresh = () => {
    if (!bookmarkId) return;
    queryClient.invalidateQueries(
      convexQuery(api.bookmarks.queries.get, { id: bookmarkId as Id<"bookmarks"> }),
    );
  };

  return refresh;
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
