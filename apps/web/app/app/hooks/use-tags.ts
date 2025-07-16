import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;

const TagsResponseSchema = z.array(TagSchema);

export const useTags = (query?: string) => {
  const [selectedTags, setSelectedTags] = useQueryState("tags", {
    defaultValue: [] as string[],
    serialize: (tags) => tags.join(","),
    parse: (str) => (str ? str.split(",").filter(Boolean) : []),
  });

  const [showTagList, setShowTagList] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  // Fetch user's tags with server-side filtering
  const {
    data: userTags = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["tags", query],
    queryFn: async (): Promise<Tag[]> => {
      try {
        const searchParams = new URLSearchParams();
        if (query) {
          searchParams.append("q", query);
        }
        
        const url = `/api/tags${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        const result = await upfetch(url, {
          schema: TagsResponseSchema,
        });
        return result;
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
    return userTags.filter(
      (tag) => !selectedTags.includes(tag.name)
    );
  }, [userTags, selectedTags]);

  const addTag = useCallback(
    (tagName: string, inputQuery?: string, onInputChange?: (query: string) => void) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
      }
      
      // Clean the input if callback is provided
      if (onInputChange && inputQuery) {
        // Remove any #tagName mentions from the input
        const cleanedQuery = inputQuery.replace(new RegExp(`#${tagName}\\s*`, 'g'), '').trim();
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
