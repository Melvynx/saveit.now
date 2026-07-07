import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@convex/_generated/api";
import { useSearch } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import type { BookmarkStatus, BookmarkType } from "@/lib/bookmark-types";
import { useCallback, useEffect, useMemo, useState } from "react";

type PublicBookmark = {
  id: string;
  url: string;
  title: string | null;
  type: BookmarkType | null;
  summary: string | null;
  preview: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogDescription: string | null;
  /** Convex timestamp (ms epoch). Optional in BookmarkCardData. */
  createdAt?: number;
  status: BookmarkStatus;
  starred: boolean;
  read: boolean;
  metadata: unknown;
};

type PublicBookmarksPage = {
  user: { name: string; image: string | null };
  bookmarks: PublicBookmark[];
  hasMore: boolean;
  nextCursor?: string;
};

export const usePublicBookmarks = (slug: string) => {
  const convex = useConvex();
  const search = useSearch({ strict: false }) as {
    query?: string;
    types?: string;
    tags?: string;
  };
  const query = search.query ?? "";
  const types = search.types?.split(",").filter(Boolean) ?? [];
  const tags = search.tags?.split(",").filter(Boolean) ?? [];
  const debouncedQuery = useDebounce(query);
  const searchQuery = debouncedQuery !== undefined ? debouncedQuery : query;
  const type = types[0] as BookmarkType | undefined;
  const [pages, setPages] = useState<PublicBookmarksPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const requestKey = useMemo(
    () => JSON.stringify({ slug, type, searchQuery, tags }),
    [searchQuery, slug, tags, type],
  );

  const loadPage = useCallback(
    async (cursor: string | null = null, append = false) => {
      if (append) {
        setIsFetchingNextPage(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await convex.query(api.bookmarks.queries.getByPublicSlug, {
          slug,
          type,
          paginationOpts: { numItems: 20, cursor },
        });
        setPages((current) =>
          append
            ? [...current, result as PublicBookmarksPage]
            : [result as PublicBookmarksPage],
        );
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [convex, slug, type],
  );

  useEffect(() => {
    setPages([]);
    void loadPage();
  }, [loadPage, requestKey]);

  const user = pages[0]?.user;
  const allBookmarks = pages.flatMap((result) =>
    (result.bookmarks ?? []) as PublicBookmark[],
  );
  const bookmarks = allBookmarks.filter((bookmark) => {
    const matchesQuery =
      !searchQuery ||
      [bookmark.title, bookmark.summary, bookmark.ogDescription, bookmark.url]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase()),
        );
    const matchesTags =
      tags.length === 0 ||
      tags.some((tag) =>
        JSON.stringify(bookmark.metadata ?? {})
          .toLowerCase()
          .includes(tag.toLowerCase()),
      );
    return matchesQuery && matchesTags;
  });
  const isTyping = query !== "" && query !== debouncedQuery;

  return {
    data: { pages },
    isLoading,
    isPending: isLoading,
    isFetchingNextPage,
    hasNextPage: Boolean(pages[pages.length - 1]?.hasMore),
    fetchNextPage: () => {
      const cursor = pages[pages.length - 1]?.nextCursor ?? null;
      if (cursor) void loadPage(cursor, true);
    },
    error: null,
    bookmarks,
    user,
    query,
    types,
    tags,
    isTyping,
  };
};
