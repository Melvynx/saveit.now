import { api } from "@convex/_generated/api";
import { useAsyncTask } from "@/lib/use-async-task";
import { useAction } from "convex/react";

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
  const runSuggestCleanup = useAction(api.tags.actions.suggestCleanup);

  const task = useAsyncTask(
    (): Promise<TagCleanupResponse> =>
      runSuggestCleanup({}) as Promise<TagCleanupResponse>,
  );

  return {
    ...task,
    mutate: task.run,
    mutateAsync: task.run,
  };
}
