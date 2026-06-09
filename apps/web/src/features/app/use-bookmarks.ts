import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Bookmark } from "@workspace/database";
import { z } from "zod";

export const useRefreshBookmarks = () => {
  const queryClient = useQueryClient();

  // This will invalidate all queries that start with "bookmarks", i.e., all pages
  const refresh = () => {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === "bookmarks",
    });
    void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  return refresh;
};

const URL_SCHEMA = z.string().url();

export const useBookmarks = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const searchParams = useSearch({ strict: false }) as {
    query?: string;
    types?: string;
    tags?: string;
    special?: string;
    matchingDistance?: string | number;
  };
  const query = searchParams.query ?? "";
  const types = searchParams.types?.split(",").filter(Boolean) ?? [];
  const tags = searchParams.tags?.split(",").filter(Boolean) ?? [];
  const special = searchParams.special?.split(",").filter(Boolean) ?? [];
  const matchingDistance = parseFloat(
    String(searchParams.matchingDistance ?? "0.1"),
  );
  const debouncedQuery = useDebounce(query);

  // Use debouncedQuery for the actual search, fallback to query if not provided
  const searchQuery = debouncedQuery !== undefined ? debouncedQuery : query;

  const data = useInfiniteQuery({
    queryKey: [
      "bookmarks",
      searchQuery,
      types,
      tags,
      special,
      matchingDistance,
      Boolean(query),
    ],
    refetchOnWindowFocus: true,
    enabled,
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    queryFn: async ({ pageParam }) => {
      if (URL_SCHEMA.safeParse(searchQuery).success) {
        return {
          bookmarks: [],
          hasMore: false,
        };
      }

      const result = await upfetch("/api/bookmarks", {
        params: {
          query: searchQuery,
          types: types.join(","),
          tags: tags.join(","),
          special: special.join(","),
          limit: 20,
          cursor: pageParam || undefined,
          matchingDistance,
        },
      });

      const json = result as { bookmarks: Bookmark[]; hasMore: boolean };

      return json;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.bookmarks.length === 0) return undefined;
      if (!lastPage.hasMore) return;

      return lastPage.bookmarks.length > 0
        ? lastPage.bookmarks[lastPage.bookmarks.length - 1]?.id
        : undefined;
    },
    initialPageParam: "",
  });

  const bookmarks = data.data?.pages.flatMap((page) => page.bookmarks) ?? [];

  // Detect if user is typing (query changed but debounced hasn't caught up)
  const isTyping = query !== "" && query !== debouncedQuery;

  return {
    ...data,
    bookmarks,
    query,
    types,
    tags,
    special,
    matchingDistance,
    isTyping,
  };
};

export const usePrefetchBookmarks = () => {
  const queryClient = useQueryClient();

  const prefetch = (query: string, matchingDistance: number) => {
    return queryClient.prefetchInfiniteQuery({
      queryKey: ["bookmarks", query, matchingDistance],
      getNextPageParam: () => {
        return undefined;
      },
      initialPageParam: "",
      queryFn: async () => {
        const result = await upfetch("/api/bookmarks", {
          params: {
            query,
            limit: 20,
            cursor: undefined,
            matchingDistance,
          },
        });

        const json = result as { bookmarks: Bookmark[]; hasMore: boolean };

        return json;
      },
    });
  };

  return prefetch;
};
