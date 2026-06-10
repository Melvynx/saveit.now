import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@convex/_generated/api";
import type { SearchResultDTO } from "@convex/search/helpers";
import { useSearch } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useRefreshBookmarks = () => {
  return () => {};
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

  const search = useAction(api.search.actions.search);
  const [pages, setPages] = useState<
    Array<{ bookmarks: SearchResultDTO[]; hasMore: boolean; nextCursor?: string }>
  >([]);
  const [isPending, setIsPending] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
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
        setIsFetchingNextPage(true);
      } else {
        setIsPending(true);
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
        types: types.length > 0 ? (types as ("TWEET" | "YOUTUBE" | "ARTICLE" | "PAGE" | "IMAGE" | "PDF" | "PRODUCT")[]) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        specialFilters: special.length > 0 ? (special as ("READ" | "UNREAD" | "STAR")[]) : undefined,
        limit: 20,
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
          setIsPending(false);
          setIsFetchingNextPage(false);
        }
      }
    },
    [enabled, matchingDistance, requestKey, search, searchQuery, special, tags, types],
  );

  useEffect(() => {
    setPages([]);
    if (!enabled) return;
    void fetchPage();
  }, [enabled, fetchPage, requestKey]);

  const bookmarks = pages.flatMap((page) => page.bookmarks);
  const lastPage = pages[pages.length - 1];
  const hasNextPage = Boolean(lastPage?.hasMore);
  const fetchNextPage = () => {
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
  };
};
