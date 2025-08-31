import { useQueryClient } from "@tanstack/react-query";
import { applyTagRefactorAction } from "../../../tags/tags.action";
import { useAction } from "next-safe-action/hooks";

export function useTagRefactor() {
  const queryClient = useQueryClient();
  
  const {
    execute,
    isExecuting,
    result,
    reset,
  } = useAction(applyTagRefactorAction, {
    onSuccess: () => {
      // Invalidate tags-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["tags-management"] });
      queryClient.invalidateQueries({ queryKey: ["tags-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  return {
    refactorTags: execute,
    isRefactoring: isExecuting,
    result,
    reset,
  };
}