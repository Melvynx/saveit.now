"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@convex/_generated/api";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { useMutation } from "convex/react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { type BookmarkDetailMode, toMarkdown } from "./bookmark-detail-utils";
import { useDeleteBookmark } from "./delete-button";

export type BookmarkDetailActions = ReturnType<typeof useBookmarkDetailActions>;

/**
 * Every action the detail toolbar, menus and meta panel expose, plus the
 * O / C / S / mod+D hotkeys. Mount once per detail view so keys never
 * double-fire.
 */
export function useBookmarkDetailActions({
  bookmark,
  mode,
  onDeleted,
}: {
  bookmark: BookmarkDetailDTO | undefined;
  mode: BookmarkDetailMode;
  onDeleted: () => void;
}) {
  const surface = mode === "dialog" ? "bookmark_panel" : "bookmark_detail";
  const setStarred = useMutation(api.bookmarks.mutations.setStarred);
  const setRead = useMutation(api.bookmarks.mutations.setRead);
  const reprocessMutation = useMutation(api.bookmarks.mutations.reprocess);
  const deleteAction = useDeleteBookmark();
  const link = useCopyToClipboard(2000);
  const share = useCopyToClipboard(2000);

  const openOriginal = () => {
    if (!bookmark) return;
    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_OPENED, { surface });
    window.open(bookmark.url, "_blank", "noopener");
  };

  const copyLink = () => {
    if (!bookmark) return;
    link.copyToClipboard(bookmark.url);
    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_COPIED, { surface });
    toast.success("Link copied");
  };

  const copyShareLink = () => {
    if (!bookmark) return;
    share.copyToClipboard(`${window.location.origin}/p/${bookmark.id}`);
    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_SHARED, { surface });
    toast.success("Public link copied");
  };

  const copyMarkdown = () => {
    if (!bookmark) return;
    void navigator.clipboard
      .writeText(toMarkdown(bookmark))
      .then(() => toast.success("Copied as Markdown"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const toggleStar = () => {
    if (!bookmark) return;
    void setStarred({ id: bookmark._id, starred: !bookmark.starred }).catch(
      (error) => toast.error(getErrorMessage(error, "Failed to update star")),
    );
  };

  const toggleRead = () => {
    if (!bookmark) return;
    void setRead({ id: bookmark._id, read: !bookmark.read }).catch((error) =>
      toast.error(getErrorMessage(error, "Failed to update read state")),
    );
  };

  const reprocess = () => {
    if (!bookmark) return;
    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_REPROCESSED, { surface });
    void reprocessMutation({ id: bookmark._id })
      .then(() => toast.success("Reprocessing started"))
      .catch((error) =>
        toast.error(getErrorMessage(error, "Could not reprocess")),
      );
  };

  const requestDelete = () => {
    if (!bookmark) return;
    const bookmarkId = bookmark.id;
    dialogManager.add({
      title: "Delete bookmark?",
      description:
        "It will be removed from your library, search and Ask AI. This cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => {
          trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_DELETED, { surface });
          deleteAction.execute(bookmarkId);
          onDeleted();
        },
      },
    });
  };

  useHotkeys("o", openOriginal, [bookmark?.url]);
  useHotkeys("c", copyLink, [bookmark?.url]);
  useHotkeys("s", toggleStar, [bookmark?._id, bookmark?.starred]);
  useHotkeys("mod+d", requestDelete, { preventDefault: true }, [
    bookmark?.id,
  ]);

  return {
    openOriginal,
    copyLink,
    copyShareLink,
    copyMarkdown,
    toggleStar,
    toggleRead,
    reprocess,
    requestDelete,
    isLinkCopied: link.isCopied,
    isShareCopied: share.isCopied,
    isDeleting: deleteAction.isPending,
  };
}
