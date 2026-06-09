import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Bookmark } from "@workspace/database";

type PublicBookmarksResponse = {
  bookmarks: Bookmark[];
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
    queryFn: async ({ pageParam }) =>
      upfetch(`/api/v1/public/${slug}/bookmarks`, {
        params: {
          query: searchQuery,
          types: types.join(","),
          tags: tags.join(","),
          limit: 20,
          cursor: pageParam || undefined,
        },
      }) as Promise<PublicBookmarksResponse>,
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

