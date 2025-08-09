"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TagType } from "@workspace/database";

type Tag = {
  id: string;
  name: string;
  type: TagType;
};

async function getTags(): Promise<Tag[]> {
  const response = await fetch(`/api/tags`);
  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }
  return response.json();
}

async function createTag(name: string) {
  const response = await fetch(`/api/tags`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return response.json() as Promise<{
    success: boolean;
    tag: Tag;
  }>;
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => getTags(),
  });
}

export const useRefreshTags = () => {
  const queryClient = useQueryClient();
  return async () => queryClient.invalidateQueries({ queryKey: ["tags"] });
};

export function useCreateTagMutation(params: {
  onSuccess?: (tag: Tag) => void;
}) {
  const refreshTags = useRefreshTags();

  return useMutation({
    mutationFn: async (name: string) => createTag(name),
    onSuccess: (data) => {
      void refreshTags();
      params.onSuccess?.(data.tag);
    },
  });
}
