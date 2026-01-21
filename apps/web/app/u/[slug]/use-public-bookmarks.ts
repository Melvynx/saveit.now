import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { useSearchParams } from "next/navigation";

type PublicBookmarksResponse = {
  bookmarks: Bookmark[];
  hasMore: boolean;
  user: {
    name: string;
    image: string | null;
  };
};

export const usePublicBookmarks = (slug: string) => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const types = searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const debouncedQuery = useDebounce(query);

  const searchQuery = debouncedQuery !== undefined ? debouncedQuery : query;

  const data = useInfiniteQuery({
    queryKey: ["public-bookmarks", slug, searchQuery, types, tags],
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam }) => {
      const result = await upfetch(`/api/v1/public/${slug}/bookmarks`, {
        params: {
          query: searchQuery,
          types: types.join(","),
          tags: tags.join(","),
          limit: 20,
          cursor: pageParam || undefined,
        },
      });

      return result as PublicBookmarksResponse;
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
