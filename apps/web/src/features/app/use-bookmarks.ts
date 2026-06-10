import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@convex/_generated/api";
import type { SearchResultDTO } from "@convex/search/helpers";
import { useSearch } from "@tanstack/react-router";
import {
  useAction,
  useConvexAuth,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const URL_SCHEMA_REGEX = /^https?:\/\/.+/;

function isUrl(str: string): boolean {
  return URL_SCHEMA_REGEX.test(str);
}

const PAGE_SIZE = 20;

type BookmarkTypeFilter =
  | "TWEET"
  | "YOUTUBE"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "PDF"
  | "PRODUCT";

/**
 * Maps URL filter params to the `bookmarks.queries.list` filter shape.
 * Mirrors `buildListFilter` in convex/search/actions.ts.
 */
function buildListFilter(types: string[], special: string[]) {
  const filter: {
    types?: BookmarkTypeFilter[];
    starred?: boolean;
    read?: boolean;
  } = {};

  if (types.length > 0) {
    filter.types = types as BookmarkTypeFilter[];
  }

  if (special.length === 1 && special.includes("STAR")) {
    filter.starred = true;
  } else if (special.length === 1 && special.includes("READ")) {
    filter.read = true;
  } else if (special.length === 1 && special.includes("UNREAD")) {
    filter.read = false;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export const useBookmarks = ({
  enabled: enabledProp = true,
}: { enabled?: boolean } = {}) => {
  // Don't fire authQueries until the Convex client holds an auth token —
  // the Better Auth session resolves before the JWT exchange completes,
  // and an early call throws UNAUTHORIZED into the error boundary.
  const { isAuthenticated } = useConvexAuth();
  const enabled = enabledProp && isAuthenticated;
  const searchParams = useSearch({ strict: false }) as {
    query?: string;
    types?: string;
    tags?: string;
    special?: string;
    matchingDistance?: string | number;
  };
  const query = searchParams.query ?? "";
  const types = useMemo(
    () => searchParams.types?.split(",").filter(Boolean) ?? [],
    [searchParams.types],
  );
  const tags = useMemo(
    () => searchParams.tags?.split(",").filter(Boolean) ?? [],
    [searchParams.tags],
  );
  const special = useMemo(
    () => searchParams.special?.split(",").filter(Boolean) ?? [],
    [searchParams.special],
  );
  const matchingDistance = parseFloat(
    String(searchParams.matchingDistance ?? "0.1"),
  );
  const debouncedQuery = useDebounce(query);

  // Use debouncedQuery for the actual search, fallback to query if not provided
  const searchQuery = debouncedQuery !== undefined ? debouncedQuery : query;
  const bookmarkCount = useQuery(
    api.bookmarks.queries.count,
    enabled ? {} : "skip",
  );

  // Browse mode (no text query, no tag search) is served by a reactive
  // paginated query so new PENDING bookmarks and processing-status changes
  // stream in live. Text/tag searches need the (non-reactive) search action.
  const isBrowsing = searchQuery.trim() === "" && tags.length === 0;

  const browse = usePaginatedQuery(
    api.bookmarks.queries.list,
    enabled && isBrowsing ? { filter: buildListFilter(types, special) } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const search = useAction(api.search.actions.search);
  const [pages, setPages] = useState<
    Array<{ bookmarks: SearchResultDTO[]; hasMore: boolean; nextCursor?: string }>
  >([]);
  const [isSearchPending, setIsSearchPending] = useState(false);
  const [isFetchingNextSearchPage, setIsFetchingNextSearchPage] =
    useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        searchQuery,
        types,
        tags,
        special,
        matchingDistance,
        query: Boolean(query),
      }),
    [matchingDistance, query, searchQuery, special, tags, types],
  );
  const latestRequestRef = useRef(requestKey);

  const fetchPage = useCallback(
    async (cursor?: string, append = false) => {
      if (!enabled) return;
      if (append) {
        setIsFetchingNextSearchPage(true);
      } else {
        setIsSearchPending(true);
      }
      setError(null);

      const activeRequest = requestKey;
      latestRequestRef.current = activeRequest;

      try {
        if (isUrl(searchQuery)) {
          const empty = {
            bookmarks: [] as SearchResultDTO[],
            hasMore: false,
            nextCursor: undefined as string | undefined,
          };
          setPages([empty]);
          return;
        }

        const result = await search({
          query: searchQuery || undefined,
          types:
            types.length > 0 ? (types as BookmarkTypeFilter[]) : undefined,
          tags: tags.length > 0 ? tags : undefined,
          specialFilters:
            special.length > 0
              ? (special as ("READ" | "UNREAD" | "STAR")[])
              : undefined,
          limit: PAGE_SIZE,
          cursor,
          matchingDistance,
        });

        if (latestRequestRef.current !== activeRequest) return;
        const page = result as {
          bookmarks: SearchResultDTO[];
          hasMore: boolean;
          nextCursor?: string;
        };
        setPages((current) => (append ? [...current, page] : [page]));
      } catch (err) {
        if (latestRequestRef.current === activeRequest) {
          setError(err);
        }
      } finally {
        if (latestRequestRef.current === activeRequest) {
          setIsSearchPending(false);
          setIsFetchingNextSearchPage(false);
        }
      }
    },
    [
      enabled,
      matchingDistance,
      requestKey,
      search,
      searchQuery,
      special,
      tags,
      types,
    ],
  );

  useEffect(() => {
    setPages([]);
    if (!enabled || isBrowsing) return;
    void fetchPage();
  }, [enabled, fetchPage, isBrowsing, requestKey]);

  const searchBookmarks = pages.flatMap((page) => page.bookmarks);
  const lastPage = pages[pages.length - 1];

  const bookmarks = isBrowsing
    ? (browse.results as SearchResultDTO[])
    : searchBookmarks;
  const isPending = isBrowsing
    ? browse.status === "LoadingFirstPage"
    : isSearchPending;
  const hasNextPage = isBrowsing
    ? browse.status === "CanLoadMore"
    : Boolean(lastPage?.hasMore);
  const isFetchingNextPage = isBrowsing
    ? browse.status === "LoadingMore"
    : isFetchingNextSearchPage;
  const fetchNextPage = () => {
    if (isBrowsing) {
      if (browse.status === "CanLoadMore") browse.loadMore(PAGE_SIZE);
      return;
    }
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchPage(lastPage?.nextCursor, true);
  };

  // Detect if user is typing (query changed but debounced hasn't caught up)
  const isTyping = query !== "" && query !== debouncedQuery;

  return {
    data: { pages },
    error,
    isPending,
    isLoading: isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    bookmarks,
    query,
    types,
    tags,
    special,
    matchingDistance,
    isTyping,
    bookmarkCount,
  };
};
