import { APP_LINKS } from "@/lib/app-links";
import { BookmarkErrorType } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRefreshBookmarks } from "./use-bookmarks";

export const useCreateBookmarkAction = (props: { onSuccess?: () => void }) => {
  const refreshBookmark = useRefreshBookmarks();
  const navigate = useNavigate();
  const createBookmark = useConvexMutation(api.bookmarks.mutations.create);

  const action = useMutation({
    mutationFn: (input: { url: string }) => createBookmark(input),
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

      const message = typedError?.message ?? "";

      if (message.includes("maximum number of bookmarks")) {
        toast.error("You have reached the maximum number of bookmarks", {
          action: {
            label: "Upgrade",
            onClick: () => {
              void navigate({ to: APP_LINKS.upgrade });
            },
          },
        });
        return;
      }

      if (message.includes("already exists")) {
        toast.error("Bookmark already exists", {});
        return;
      }

      if (typedError?.type === BookmarkErrorType.MAX_BOOKMARKS) {
        toast.error("You have reached the maximum number of bookmarks", {
          action: {
            label: "Upgrade",
            onClick: () => {
              void navigate({ to: APP_LINKS.upgrade });
            },
          },
        });
        return;
      }

      if (typedError?.type === BookmarkErrorType.BOOKMARK_ALREADY_EXISTS) {
        toast.error("Bookmark already exists", {});
        return;
      }

      toast.error(typedError?.message ?? "Failed to create bookmark");
    },
  });

  return {
    ...action,
    execute: action.mutate,
  };
};
