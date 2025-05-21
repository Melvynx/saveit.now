import { useAction } from "next-safe-action/hooks";
import { createBookmarkAction } from "./bookmarks.action";
import { useRefreshBookmarks } from "./use-bookmarks";

export const useCreateBookmarkAction = (props: { onSuccess?: () => void }) => {
  const refreshBookmark = useRefreshBookmarks();
  const action = useAction(createBookmarkAction, {
    onSuccess: () => {
      props.onSuccess?.();

      void refreshBookmark();
    },
  });

  return action;
};
