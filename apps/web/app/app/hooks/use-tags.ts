import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  type: z.enum(["USER", "IA"]),
});

export type Tag = z.infer<typeof TagSchema>;

const TagsPageResponseSchema = z.object({
  tags: z.array(TagSchema),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});

export const useTags = (query?: string) => {
  const [selectedTags, setSelectedTags] = useQueryState("tags", {
    defaultValue: [] as string[],
    serialize: (tags) => tags.join(","),
    parse: (str) => (str ? str.split(",").filter(Boolean) : []),
  });

  const [showTagList, setShowTagList] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  // Debounce the query to avoid API calls on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // Fetch user's tags with server-side filtering
  const {
    data: userTags = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["tags", debouncedQuery],
    queryFn: async (): Promise<Tag[]> => {
      try {
        const searchParams = new URLSearchParams();
        if (debouncedQuery) {
          searchParams.append("q", debouncedQuery);
        }

        const url = `/api/tags${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        const result = await upfetch(url, {
          schema: TagsPageResponseSchema,
        });
        return result.tags;
      } catch (err) {
        console.error("Failed to fetch tags:", err);
        throw new Error("Failed to load tags. Please try again.");
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Filter out already selected tags (client-side)
  const filteredTags = useMemo(() => {
    return userTags.filter((tag) => !selectedTags.includes(tag.name));
  }, [userTags, selectedTags]);

  const addTag = useCallback(
    (
      tagName: string,
      inputQuery?: string,
      onInputChange?: (query: string) => void,
    ) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
      }

      // Clean the input if callback is provided
      if (onInputChange && inputQuery) {
        // Remove any #tagName mentions from the input
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

  const retryFetch = useCallback(() => {
    refetch();
  }, [refetch]);

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
    isLoading: isLoading || isRefetching,
    error,
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

  // Debounce the query to avoid API calls on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["tags-infinite", debouncedQuery],
    queryFn: async ({
      pageParam,
    }): Promise<z.infer<typeof TagsPageResponseSchema>> => {
      try {
        const searchParams = new URLSearchParams();
        if (debouncedQuery) {
          searchParams.append("q", debouncedQuery);
        }
        if (pageParam) {
          searchParams.append("cursor", pageParam);
        }
        searchParams.append("limit", "10");

        const url = `/api/tags${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        const result = await upfetch(url, {
          schema: TagsPageResponseSchema,
        });
        return result;
      } catch (err) {
        console.error("Failed to fetch tags:", err);
        throw new Error("Failed to load tags. Please try again.");
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Flatten all pages into a single array
  const allTags = useMemo(() => {
    return data?.pages.flatMap((page) => page.tags) ?? [];
  }, [data]);

  // Filter out already selected tags (client-side)
  const filteredTags = useMemo(() => {
    return allTags.filter((tag) => !selectedTags.includes(tag.name));
  }, [allTags, selectedTags]);

  const addTag = useCallback(
    (
      tagName: string,
      inputQuery?: string,
      onInputChange?: (query: string) => void,
    ) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
      }

      // Clean the input if callback is provided
      if (onInputChange && inputQuery) {
        // Remove any #tagName mentions from the input
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

  const retryFetch = useCallback(() => {
    refetch();
  }, [refetch]);

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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoading || isRefetching,
    error,
    retryFetch,
  };
};
