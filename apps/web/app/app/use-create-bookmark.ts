import { APP_LINKS } from "@/lib/app-links";
import { BookmarkErrorType } from "@/lib/errors";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBookmarkAction } from "./bookmarks.action";
import { useRefreshBookmarks } from "./use-bookmarks";

export const useCreateBookmarkAction = (props: { onSuccess?: () => void }) => {
  const refreshBookmark = useRefreshBookmarks();
  const router = useRouter();
  const action = useAction(createBookmarkAction, {
    onSuccess: () => {
      props.onSuccess?.();

      void refreshBookmark();
    },
    onError: (error) => {
      const serverError = error.error.serverError;

      if (serverError?.type === BookmarkErrorType.MAX_BOOKMARKS) {
        toast.error("You have reached the maximum number of bookmarks", {
          action: {
            label: "Upgrade",
            onClick: () => {
              router.push(APP_LINKS.upgrade);
            },
          },
        });
      }

      if (serverError?.type === BookmarkErrorType.BOOKMARK_ALREADY_EXISTS) {
        toast.error("Bookmark already exists", {});
      }

      toast.error(serverError?.message);
    },
  });

  return action;
};
