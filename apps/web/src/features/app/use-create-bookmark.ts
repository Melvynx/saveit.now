import { APP_LINKS } from "@/lib/app-links";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { BookmarkErrorType } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";

export const useCreateBookmarkAction = (props: { onSuccess?: () => void }) => {
  const navigate = useNavigate();
  const createBookmark = useMutation(api.bookmarks.mutations.create);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const execute = (input: { url: string }) => {
    setIsPending(true);
    setError(null);
    void createBookmark(input)
      .then(() => {
        trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_CREATED);
        props.onSuccess?.();
      })
      .catch((error) => {
        setError(error);
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
      })
      .finally(() => setIsPending(false));
  };

  return {
    isPending,
    error,
    execute,
  };
};
