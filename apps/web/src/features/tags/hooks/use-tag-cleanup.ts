import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";

export type TagCleanupSuggestion = {
  bestTag: string;
  bestTagExists: boolean;
  bestTagId?: string;
  bestTagBookmarkCount: number;
  refactorTags: Array<{
    id: string;
    name: string;
    bookmarkCount: number;
  }>;
  totalBookmarks: number;
};

export type TagCleanupResponse = {
  suggestions: TagCleanupSuggestion[];
  totalTags: number;
};

export function useTagCleanup() {
  const runSuggestCleanup = useConvexAction(api.tags.actions.suggestCleanup);

  return useMutation({
    mutationFn: (): Promise<TagCleanupResponse> =>
      runSuggestCleanup({}) as Promise<TagCleanupResponse>,
    mutationKey: ["tag-cleanup"],
  });
}
