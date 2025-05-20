import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { URL_SCHEMA } from "./schema";

export const useRefreshBookmarks = () => {
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["bookmarks"],
    });
  };

  return refresh;
};

export const useBookmarks = (query: string) => {
  const data = useInfiniteQuery({
    queryKey: ["bookmarks", query],
    queryFn: async ({ pageParam }) => {
      if (URL_SCHEMA.safeParse(query).success) {
        return {
          bookmarks: [],
          hasMore: false,
        };
      }

      const result = await upfetch("/api/bookmarks", {
        params: {
          query,
          limit: 20,
          cursor: pageParam || undefined,
        },
      });

      const json = result as { bookmarks: Bookmark[]; hasMore: boolean };

      return json;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.bookmarks.length === 0) return undefined;
      if (!lastPage.hasMore) return;

      return lastPage.bookmarks.length > 0
        ? lastPage.bookmarks[lastPage.bookmarks.length - 1]?.id
        : undefined;
    },
    initialPageParam: "",
  });

  const bookmarks = data.data?.pages.flatMap((page) => page.bookmarks) ?? [];

  return {
    ...data,
    bookmarks,
  };
};
