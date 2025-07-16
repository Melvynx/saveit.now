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

export const useTags = () => {
  const [selectedTags, setSelectedTags] = useQueryState("tags", {
    defaultValue: [] as string[],
    serialize: (tags) => tags.join(","),
    parse: (str) => (str ? str.split(",").filter(Boolean) : []),
  });

  const [showTagList, setShowTagList] = useState(false);
  const [tagFilter, setTagFilter] = useState("");

  // Fetch user's tags
  const {
    data: userTags = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<Tag[]> => {
      try {
        const result = await upfetch("/api/tags", {
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

  // Filter tags based on search and exclude already selected
  const filteredTags = useMemo(() => {
    return userTags
      .filter(
        (tag) =>
          tag.name.toLowerCase().includes(tagFilter.toLowerCase()) &&
          !selectedTags.includes(tag.name),
      )
      .slice(0, 10); // Limit to 10 for performance
  }, [userTags, tagFilter, selectedTags]);

  const addTag = useCallback(
    (tagName: string) => {
      if (!selectedTags.includes(tagName)) {
        setSelectedTags([...selectedTags, tagName]);
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
