import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import type { BookmarkStatus, BookmarkType } from "@/lib/bookmark-types";

// Convex site URL — set via VITE_CONVEX_SITE_URL env var.
const convexSiteUrl =
  typeof window !== "undefined"
    ? (import.meta.env?.VITE_CONVEX_SITE_URL ?? "")
    : "";

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

type PublicBookmarksResponse = {
  bookmarks: PublicBookmark[];
  hasMore: boolean;
  user: {
    name: string;
    image: string | null;
  };
};

export const usePublicBookmarks = (slug: string) => {
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

  const data = useInfiniteQuery({
    queryKey: ["public-bookmarks", slug, searchQuery, types, tags],
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (types.length > 0) params.set("types", types.join(","));
      if (tags.length > 0) params.set("tags", tags.join(","));
      params.set("limit", "20");
      if (pageParam) params.set("cursor", pageParam as string);

      const base = convexSiteUrl || "";
      const res = await fetch(
        `${base}/api/v1/public/${slug}/bookmarks?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch public bookmarks");
      return res.json() as Promise<PublicBookmarksResponse>;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.bookmarks.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return lastPage.bookmarks.length > 0
        ? lastPage.bookmarks[lastPage.bookmarks.length - 1]?.id
        : undefined;
    },
    initialPageParam: "",
  });

  const bookmarks = data.data?.pages.flatMap((page) => page.bookmarks) ?? [];
  const user = data.data?.pages[0]?.user;
  const isTyping = query !== "" && query !== debouncedQuery;

  return {
    ...data,
    bookmarks,
    user,
    query,
    types,
    tags,
    isTyping,
  };
};

