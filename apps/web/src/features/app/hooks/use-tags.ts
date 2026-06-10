import { api } from "@convex/_generated/api";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";

export type Tag = {
  _id: string;
  id: string;
  name: string;
  type: "USER" | "IA";
};

export const useTags = (query?: string) => {
  const [selectedTags, setSelectedTags] = useQueryState("tags", {
    defaultValue: [] as string[],
    serialize: (tags) => tags.join(","),
    parse: (str) => (str ? str.split(",").filter(Boolean) : []),
  });

  const [showTagList, setShowTagList] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  const debouncedQuery = useDebounce(query, 300);

  const data = useQuery(
    api.tags.queries.list,
    {
      paginationOpts: { numItems: 50, cursor: null },
      query: debouncedQuery || undefined,
    },
  );

  const userTags: Tag[] = useMemo(
    () => (data?.page as Tag[] | undefined) ?? [],
    [data],
  );

  const filteredTags = useMemo(
    () => userTags.filter((tag) => !selectedTags.includes(tag.name)),
    [userTags, selectedTags],
  );

  const addTag = useCallback(
    (
      tagName: string,
      inputQuery?: string,
      onInputChange?: (query: string) => void,
    ) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
      }
      if (onInputChange && inputQuery) {
        const cleanedQuery = inputQuery
          .replace(new RegExp(`#${tagName}\\s*`, "g"), "")
          .trim();
        onInputChange(cleanedQuery);
      }
      setShowTagList(false);
      setTagFilter("");
    },
    [selectedTags, setSelectedTags],
  );

  const removeTag = useCallback(
    (tagName: string) => {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    },
    [selectedTags, setSelectedTags],
  );

  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, [setSelectedTags]);

  const retryFetch = useCallback(() => {}, []);

  return {
    selectedTags,
    showTagList,
    setShowTagList,
    tagFilter,
    setTagFilter,
    filteredTags,
    addTag,
    removeTag,
    clearTags,
    isLoading: data === undefined,
    error: null,
    retryFetch,
  };
};

export const useInfiniteTags = (query?: string) => {
  const [selectedTags, setSelectedTags] = useQueryState("tags", {
    defaultValue: [] as string[],
    serialize: (tags) => tags.join(","),
    parse: (str) => (str ? str.split(",").filter(Boolean) : []),
  });

  const [showTagList, setShowTagList] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  const debouncedQuery = useDebounce(query, 300);

  const {
    results,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.tags.queries.list,
    { query: debouncedQuery || undefined },
    { initialNumItems: 10 },
  );

  const allTags = useMemo(() => (results as Tag[]) ?? [], [results]);

  const filteredTags = useMemo(
    () => allTags.filter((tag) => !selectedTags.includes(tag.name)),
    [allTags, selectedTags],
  );

  const addTag = useCallback(
    (
      tagName: string,
      inputQuery?: string,
      onInputChange?: (query: string) => void,
    ) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
      }
      if (onInputChange && inputQuery) {
        const cleanedQuery = inputQuery
          .replace(new RegExp(`#${tagName}\\s*`, "g"), "")
          .trim();
        onInputChange(cleanedQuery);
      }
      setShowTagList(false);
      setTagFilter("");
    },
    [selectedTags, setSelectedTags],
  );

  const removeTag = useCallback(
    (tagName: string) => {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    },
    [selectedTags, setSelectedTags],
  );

  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, [setSelectedTags]);

  return {
    selectedTags,
    showTagList,
    setShowTagList,
    tagFilter,
    setTagFilter,
    filteredTags,
    allTags,
    addTag,
    removeTag,
    clearTags,
    fetchNextPage: () => loadMore(10),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: isLoading,
    error: null as Error | null,
    retryFetch: () => {},
  };
};
