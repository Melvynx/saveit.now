"use client";

import { api } from "@convex/_generated/api";
import { useAsyncTask } from "@/lib/use-async-task";
import { useMutation } from "convex/react";

type Tag = {
  id: string;
  name: string;
  type: "USER" | "IA";
};

export function useTags() {
  // useTags is kept for backward compatibility.
  // Consumers that need the tag list should use useInfiniteTags from features/app/hooks/use-tags.
  return { data: undefined as Tag[] | undefined, isLoading: false, error: null };
}

export const useRefreshTags = () => {
  return async () => {};
};

export function useCreateTagMutation(params: {
  onSuccess?: (tag: Tag) => void;
}) {
  const createTag = useMutation(api.tags.mutations.create);

  const task = useAsyncTask(
    async (name: string) => {
      const tag = await createTag({ name, type: "USER" });
      return { success: true, tag: tag as Tag };
    },
    {
      onSuccess: (data) => {
        params.onSuccess?.(data.tag);
      },
    },
  );

  return {
    ...task,
    mutate: task.run,
    mutateAsync: task.run,
    isPending: task.isPending,
  };
}
