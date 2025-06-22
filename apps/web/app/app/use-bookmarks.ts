import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";

const TAG_REGEX = /#([^\s#@]+)/g;
const TYPE_REGEX = /@([^\s#@]+)/g;

function parseQuery(input: string) {
  const tags: string[] = [];
  const types: string[] = [];

  let match;
  while ((match = TAG_REGEX.exec(input))) {
    tags.push(match[1]);
  }
  while ((match = TYPE_REGEX.exec(input))) {
    types.push(match[1].toUpperCase());
  }

  const cleaned = input
    .replace(TAG_REGEX, "")
    .replace(TYPE_REGEX, "")
    .trim();

  return { query: cleaned, tags, types };
}
import { useSearchParams } from "next/navigation";
import { z } from "zod";

export const useRefreshBookmarks = () => {
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["bookmarks"],
    });
  };

  return refresh;
};

const URL_SCHEMA = z.string().url();

export const useBookmarks = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const matchingDistance = parseFloat(
    searchParams.get("matchingDistance") ?? "0.1",
  );
  const debouncedQuery = useDebounce(query);

  // Use debouncedQuery for the actual search, fallback to query if not provided
  const searchQuery = debouncedQuery !== undefined ? debouncedQuery : query;

  const data = useInfiniteQuery({
    queryKey: ["bookmarks", searchQuery, matchingDistance],
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    queryFn: async ({ pageParam }) => {
      if (URL_SCHEMA.safeParse(searchQuery).success) {
        return {
          bookmarks: [],
          hasMore: false,
        };
      }

      const parsed = parseQuery(searchQuery);

      const result = await upfetch("/api/bookmarks", {
        params: {
          query: parsed.query,
          tags: parsed.tags,
          types: parsed.types,
          limit: 20,
          cursor: pageParam || undefined,
          matchingDistance,
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
    query,
    matchingDistance,
  };
};

export const usePrefetchBookmarks = () => {
  const queryClient = useQueryClient();

  const prefetch = (query: string, matchingDistance: number) => {
    const parsed = parseQuery(query);
    return queryClient.prefetchInfiniteQuery({
      queryKey: ["bookmarks", query, matchingDistance],
      getNextPageParam: () => {
        return undefined;
      },
      initialPageParam: "",
      queryFn: async () => {
        console.log("prefetching bookmarks", query, matchingDistance);

        const result = await upfetch("/api/bookmarks", {
          params: {
            query: parsed.query,
            tags: parsed.tags,
            types: parsed.types,
            limit: 20,
            cursor: undefined,
            matchingDistance,
          },
        });

        console.log("prefetching bookmarks", result);

        const json = result as { bookmarks: Bookmark[]; hasMore: boolean };

        return json;
      },
    });
  };

  return prefetch;
};
