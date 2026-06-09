import { api } from "@convex/_generated/api";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

export interface Tag {
  id: string;
  name: string;
  type: "USER" | "IA";
}

export const useBookmarkTags = (bookmarkId?: string | null) => {
  const queryClient = useQueryClient();
  const setBookmarkTagsByName = useConvexMutation(
    api.tags.mutations.setBookmarkTagsByName,
  );

  const query = useQuery({
    ...convexQuery(
      api.tags.queries.getByBookmark,
      bookmarkId ? { bookmarkId: bookmarkId as Id<"bookmarks"> } : "skip",
    ),
    enabled: !!bookmarkId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (data): Tag[] =>
      data
        ? data.map((t) => ({ id: t._id, name: t.name, type: t.type as "USER" | "IA" }))
        : [],
  });

  const mutation = useMutation({
    mutationFn: ({
      bookmarkId: bId,
      tags,
    }: {
      bookmarkId: string;
      tags: string[];
    }) =>
      setBookmarkTagsByName({
        bookmarkId: bId as Id<"bookmarks">,
        tagNames: tags,
      }),
    onMutate: async ({ bookmarkId: mutateBookmarkId, tags: newTags }) => {
      if (!mutateBookmarkId) return;

      const convexKey = convexQuery(api.tags.queries.getByBookmark, {
        bookmarkId: mutateBookmarkId as Id<"bookmarks">,
      });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries(convexKey);

      // Snapshot the previous value
      const previousTags = queryClient.getQueryData(convexKey.queryKey);

      // Optimistically update to the new value
      const optimisticTags: Tag[] = newTags.map((name) => ({
        id: `temp-${name}`,
        name,
        type: "USER" as const,
      }));

      queryClient.setQueryData(convexKey.queryKey, optimisticTags);

      // Return a context object with the snapshotted value
      return { previousTags, bookmarkId: mutateBookmarkId };
    },
    onError: (_error, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.bookmarkId) {
        const convexKey = convexQuery(api.tags.queries.getByBookmark, {
          bookmarkId: context.bookmarkId as Id<"bookmarks">,
        });
        queryClient.setQueryData(convexKey.queryKey, context.previousTags);
      }
      toast.error("Failed to update tags");
    },
    onSuccess: (_data, { bookmarkId: successBookmarkId }) => {
      // Invalidate bookmark list queries to ensure consistency
      queryClient.invalidateQueries({
        predicate: (q) => {
          const qKey = q.queryKey;
          return (
            Array.isArray(qKey) &&
            qKey[0] === "bookmarks" &&
            !qKey.includes(successBookmarkId)
          );
        },
      });

      toast.success("Tags updated");
    },
    onSettled: (_data, _error, { bookmarkId: settledBookmarkId }) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries(
        convexQuery(api.tags.queries.getByBookmark, {
          bookmarkId: settledBookmarkId as Id<"bookmarks">,
        }),
      );
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
    void queryClient.prefetchQuery(
      convexQuery(api.tags.queries.getByBookmark, {
        bookmarkId: bookmarkId as Id<"bookmarks">,
      }),
    );
  };

  return prefetch;
};
