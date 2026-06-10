import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

export interface Tag {
  id: string;
  name: string;
  type: "USER" | "IA";
}

export const useBookmarkTags = (bookmarkId?: string | null) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const setBookmarkTagsByName = useMutation(
    api.tags.mutations.setBookmarkTagsByName,
  );

  const data = useQuery(
    api.tags.queries.getByBookmark,
    bookmarkId ? { bookmarkId: bookmarkId as Id<"bookmarks"> } : "skip",
  );

  const tags: Tag[] =
    data?.map((t) => ({
      id: t._id,
      name: t.name,
      type: t.type as "USER" | "IA",
    })) ?? [];

  const updateTags = (tagNames: string[]) => {
    if (!bookmarkId) {
      toast.error("No bookmark selected");
      return;
    }
    setIsUpdating(true);
    void setBookmarkTagsByName({
      bookmarkId: bookmarkId as Id<"bookmarks">,
      tagNames,
    })
      .then(() => toast.success("Tags updated"))
      .catch(() => toast.error("Failed to update tags"))
      .finally(() => setIsUpdating(false));
  };

  const addTag = (tagName: string) => {
    const currentTags = tags;
    const tagNames = currentTags.map((tag) => tag.name);
    if (!tagNames.includes(tagName)) {
      updateTags([...tagNames, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    const currentTags = tags;
    const tagNames = currentTags
      .map((tag) => tag.name)
      .filter((name) => name !== tagName);
    updateTags(tagNames);
  };

  const toggleTag = (tagName: string) => {
    const currentTags = tags;
    const tagNames = currentTags.map((tag) => tag.name);
    if (tagNames.includes(tagName)) {
      removeTag(tagName);
    } else {
      addTag(tagName);
    }
  };

  return {
    tags,
    isLoading: data === undefined,
    isError: false,
    error: null,
    isUpdating,
    updateTags,
    addTag,
    removeTag,
    toggleTag,
    refetch: () => {},
  };
};

export const usePrefetchBookmarkTags = () => {
  return (_bookmarkId?: string | null) => {};
};
