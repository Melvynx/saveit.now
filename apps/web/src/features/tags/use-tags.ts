"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  return async () => queryClient.invalidateQueries({ queryKey: ["tags"] });
};

export function useCreateTagMutation(params: {
  onSuccess?: (tag: Tag) => void;
}) {
  const doCreate = useConvexMutation(api.tags.mutations.create);

  return useMutation({
    mutationFn: async (name: string) => {
      const tag = await doCreate({ name, type: "USER" });
      return { success: true, tag: tag as Tag };
    },
    onSuccess: (data) => {
      params.onSuccess?.(data.tag);
    },
  });
}
