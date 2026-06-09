import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type RefactorInput = {
  refactors: Array<{
    bestTag: string;
    refactorTagIds: string[];
    createBestTag?: boolean;
  }>;
};

export function useTagRefactor() {
  const queryClient = useQueryClient();
  const doRefactor = useConvexMutation(api.tags.mutations.refactor);

  const mutation = useMutation({
    mutationFn: (input: RefactorInput) =>
      doRefactor({
        refactors: input.refactors.map((r) => ({
          bestTag: r.bestTag,
          refactorTagIds: r.refactorTagIds as Id<"tags">[],
          createBestTag: r.createBestTag,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags-management"] });
      void queryClient.invalidateQueries({ queryKey: ["tags-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  return {
    refactorTags: mutation.mutateAsync,
    isRefactoring: mutation.isPending,
    result: mutation.data,
    reset: mutation.reset,
  };
}
