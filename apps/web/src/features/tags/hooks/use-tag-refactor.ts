import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAsyncTask } from "@/lib/use-async-task";
import { useMutation } from "convex/react";

export type RefactorInput = {
  refactors: Array<{
    bestTag: string;
    refactorTagIds: string[];
    createBestTag?: boolean;
  }>;
};

export function useTagRefactor() {
  const doRefactor = useMutation(api.tags.mutations.refactor);

  const task = useAsyncTask((input: RefactorInput) =>
    doRefactor({
      refactors: input.refactors.map((r) => ({
        bestTag: r.bestTag,
        refactorTagIds: r.refactorTagIds as Id<"tags">[],
        createBestTag: r.createBestTag,
      })),
    }),
  );

  return {
    refactorTags: task.run,
    isRefactoring: task.isPending,
    result: task.data,
    reset: () => {},
  };
}
