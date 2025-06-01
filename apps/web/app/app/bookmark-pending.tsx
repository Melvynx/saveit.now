"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { ButtonProps } from "@workspace/ui/components/button";
import { deleteBookmarkAction } from "app/app/bookmark-page/bookmarks.action";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRefreshBookmarks } from "./use-bookmarks";

// Re-export the main BookmarkPending component from the modular structure
export { BookmarkCardPending as BookmarkPending } from "./bookmark-card/bookmark-card-pending";

export const DeleteButtonAction = ({
  bookmarkId,
  ...props
}: ButtonProps & { bookmarkId: string }) => {
  const refreshBookmarks = useRefreshBookmarks();
  const deleteAction = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      toast.success("Bookmark deleted");
      void refreshBookmarks();
    },
  });

  return (
    <LoadingButton
      loading={deleteAction.isExecuting}
      variant="ghost"
      size="sm"
      onClick={() =>
        deleteAction.execute({
          bookmarkId,
        })
      }
      {...props}
    >
      {props.children ?? "Stop"}
    </LoadingButton>
  );
};
