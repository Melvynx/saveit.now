import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { toast } from "sonner";

type Surface = "bookmark_card";

/** Single-bookmark quick actions shared by the card cluster and grid hotkeys. */
export function useBookmarkActions(surface: Surface = "bookmark_card") {
  const setStarredMutation = useMutation(api.bookmarks.mutations.setStarred);
  const setReadMutation = useMutation(api.bookmarks.mutations.setRead);
  const { copyToClipboard, isCopied } = useCopyToClipboard(2000);

  const setStarred = useCallback(
    (id: string, starred: boolean) =>
      setStarredMutation({ id: id as Id<"bookmarks">, starred }).catch(
        (error: unknown) => {
          toast.error(getErrorMessage(error, "Failed to update star"));
        },
      ),
    [setStarredMutation],
  );

  const setRead = useCallback(
    (id: string, read: boolean) =>
      setReadMutation({ id: id as Id<"bookmarks">, read }).catch(
        (error: unknown) => {
          toast.error(getErrorMessage(error, "Failed to update read state"));
        },
      ),
    [setReadMutation],
  );

  const copyLink = useCallback(
    (url: string, options?: { toast?: boolean }) => {
      trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_COPIED, { surface });
      copyToClipboard(url);
      if (options?.toast) toast.success("Link copied");
    },
    [copyToClipboard, surface],
  );

  const openOriginal = useCallback(
    (url: string) => {
      trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_OPENED, { surface });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [surface],
  );

  return { setStarred, setRead, copyLink, openOriginal, isCopied };
}
