import { upfetch } from "@/lib/up-fetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const RefactorInputSchema = z.object({
  refactors: z.array(
    z.object({
      bestTag: z.string(),
      refactorTagIds: z.array(z.string()),
      createBestTag: z.boolean().optional(),
    }),
  ),
});

export type RefactorInput = z.infer<typeof RefactorInputSchema>;

export function useTagRefactor() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: RefactorInput) =>
      upfetch("/api/tags/refactor", {
        method: "POST",
        body: RefactorInputSchema.parse(input),
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

