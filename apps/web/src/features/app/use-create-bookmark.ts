import { APP_LINKS } from "@/lib/app-links";
import { BookmarkErrorType } from "@/lib/errors";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRefreshBookmarks } from "./use-bookmarks";

export const useCreateBookmarkAction = (props: { onSuccess?: () => void }) => {
  const refreshBookmark = useRefreshBookmarks();
  const navigate = useNavigate();
  const action = useMutation({
    mutationFn: (input: { url: string }) =>
      upfetch("/api/bookmarks", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      props.onSuccess?.();

      void refreshBookmark();
    },
    onError: (error) => {
      const serverError =
        error instanceof Error ? { message: error.message } : error;
      const typedError = serverError as
        | { message?: string; type?: string }
        | undefined;

      if (
        typedError?.type === BookmarkErrorType.MAX_BOOKMARKS
      ) {
        toast.error("You have reached the maximum number of bookmarks", {
          action: {
            label: "Upgrade",
            onClick: () => {
              void navigate({ to: APP_LINKS.upgrade });
            },
          },
        });
      }

      if (
        typedError?.type === BookmarkErrorType.BOOKMARK_ALREADY_EXISTS
      ) {
        toast.error("Bookmark already exists", {});
      }

      toast.error(typedError?.message);
    },
  });

  return {
    ...action,
    execute: action.mutate,
  };
};
