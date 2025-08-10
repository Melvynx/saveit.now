import { upfetch } from "@/lib/up-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TagType } from "@workspace/database";
import { toast } from "sonner";
import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(TagType),
});

export interface Tag {
  id: string;
  name: string;
  type: TagType;
}

const fetchBookmarkTags = async (bookmarkId: string): Promise<Tag[]> => {
  const result = await upfetch(`/api/bookmarks/${bookmarkId}/tags`, {
    schema: z.object({
      tags: z.array(TagSchema),
    }),
  });
  return result.tags;
};

const updateBookmarkTags = async ({
  bookmarkId,
  tags,
}: {
  bookmarkId: string;
  tags: string[];
}): Promise<Tag[]> => {
  const result = await upfetch(`/api/bookmarks/${bookmarkId}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ tags }),
    headers: {
      "Content-Type": "application/json",
    },
    schema: z.object({
      tags: z.array(TagSchema),
    }),
  });
  return result.tags;
};

export const useBookmarkTags = (bookmarkId?: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bookmark", bookmarkId, "tags"],
    queryFn: () => {
      if (!bookmarkId) {
        return [];
      }
      return fetchBookmarkTags(bookmarkId);
    },
    enabled: !!bookmarkId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: updateBookmarkTags,
    onMutate: async ({ bookmarkId: mutateBookmarkId, tags: newTags }) => {
      if (!mutateBookmarkId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["bookmark", mutateBookmarkId, "tags"],
      });

      // Snapshot the previous value
      const previousTags = queryClient.getQueryData([
        "bookmark",
        mutateBookmarkId,
        "tags",
      ]);

      // Optimistically update to the new value
      const optimisticTags: Tag[] = newTags.map((name) => ({
        id: `temp-${name}`,
        name,
        type: "USER" as TagType,
      }));

      queryClient.setQueryData(
        ["bookmark", mutateBookmarkId, "tags"],
        optimisticTags,
      );

      // Return a context object with the snapshotted value
      return { previousTags, bookmarkId: mutateBookmarkId };
    },
    onError: (_error, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTags && context?.bookmarkId) {
        queryClient.setQueryData(
          ["bookmark", context.bookmarkId, "tags"],
          context.previousTags,
        );
      }
      toast.error("Failed to update tags");
    },
    onSuccess: (data, { bookmarkId: successBookmarkId }) => {
      // Update with real data from server
      queryClient.setQueryData(
        ["bookmark", successBookmarkId, "tags"],
        data,
      );

      // Also update the main bookmark cache if it exists
      queryClient.setQueryData(
        ["bookmark", successBookmarkId],
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === "object" &&
            "bookmark" in oldData
          ) {
            return {
              ...oldData,
              bookmark: {
                ...(oldData.bookmark as Record<string, unknown>),
                tags: data.map((tag) => ({ tag })),
              },
            };
          }
          return oldData;
        },
      );

      // Invalidate bookmark list queries to ensure consistency
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            queryKey[0] === "bookmarks" &&
            !queryKey.includes(successBookmarkId)
          );
        },
      });

      toast.success("Tags updated");
    },
    onSettled: (_data, _error, { bookmarkId: settledBookmarkId }) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ["bookmark", settledBookmarkId, "tags"],
      });
    },
  });

  const updateTags = (tagNames: string[]) => {
    if (!bookmarkId) {
      toast.error("No bookmark selected");
      return;
    }
    mutation.mutate({ bookmarkId, tags: tagNames });
  };

  const addTag = (tagName: string) => {
    const currentTags = query.data || [];
    const tagNames = currentTags.map((tag) => tag.name);
    if (!tagNames.includes(tagName)) {
      updateTags([...tagNames, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    const currentTags = query.data || [];
    const tagNames = currentTags
      .map((tag) => tag.name)
      .filter((name) => name !== tagName);
    updateTags(tagNames);
  };

  const toggleTag = (tagName: string) => {
    const currentTags = query.data || [];
    const tagNames = currentTags.map((tag) => tag.name);
    if (tagNames.includes(tagName)) {
      removeTag(tagName);
    } else {
      addTag(tagName);
    }
  };

  return {
    tags: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isUpdating: mutation.isPending,
    updateTags,
    addTag,
    removeTag,
    toggleTag,
    refetch: query.refetch,
  };
};

export const usePrefetchBookmarkTags = () => {
  const queryClient = useQueryClient();

  const prefetch = (bookmarkId?: string | null) => {
    if (!bookmarkId) {
      return;
    }
    void queryClient.prefetchQuery({
      queryKey: ["bookmark", bookmarkId, "tags"],
      queryFn: () => fetchBookmarkTags(bookmarkId),
      staleTime: 1000 * 60 * 5,
    });
  };

  return prefetch;
};