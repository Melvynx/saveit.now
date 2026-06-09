import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@convex/_generated/api";
import type { SearchResultDTO } from "@convex/search/helpers";
import { useConvexAction } from "@convex-dev/react-query";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

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

const URL_SCHEMA_REGEX = /^https?:\/\/.+/;

function isUrl(str: string): boolean {
  return URL_SCHEMA_REGEX.test(str);
}

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

  const search = useConvexAction(api.search.actions.search);

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
      if (isUrl(searchQuery)) {
        return {
          bookmarks: [] as SearchResultDTO[],
          hasMore: false,
          nextCursor: undefined as string | undefined,
        };
      }

      const result = await search({
        query: searchQuery || undefined,
        types: types.length > 0 ? (types as ("TWEET" | "YOUTUBE" | "ARTICLE" | "PAGE" | "IMAGE" | "PDF" | "PRODUCT")[]) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        specialFilters: special.length > 0 ? (special as ("READ" | "UNREAD" | "STAR")[]) : undefined,
        limit: 20,
        cursor: (pageParam as string) || undefined,
        matchingDistance,
      });

      return result as { bookmarks: SearchResultDTO[]; hasMore: boolean; nextCursor?: string };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPage as { nextCursor?: string }).nextCursor ?? undefined;
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
