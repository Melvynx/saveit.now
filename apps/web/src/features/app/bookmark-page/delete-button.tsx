"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { LoadingButton } from "@/features/form/loading-button";
import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { ButtonProps } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Trash } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRefreshBookmarks } from "../use-bookmarks";
import type { Id } from "@convex/_generated/dataModel";

export type DeleteButtonProps = { bookmarkId: string } & ButtonProps;

export const DeleteButton = ({ bookmarkId, ...props }: DeleteButtonProps) => {
  const action = useDeleteBookmark();
  const posthog = usePostHog();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const handleDelete = () => {
    dialogManager.add({
      title: "Delete Bookmark",
      description: "Are you sure you want to delete this bookmark?",
      action: {
        label: "Delete",
        onClick: () => {
          posthog.capture("bookmark+delete", {
            bookmark_id: bookmarkId,
          });
          action.mutate(bookmarkId);
          void navigate({ to: "/app", search });
        },
      },
    });
  };

  useHotkeys("mod+d", () => {
    handleDelete();
  });

  return (
    <InlineTooltip title="Delete (⌘D)">
      <LoadingButton
        loading={action.isPending}
        variant="destructive"
        onClick={() => {
          handleDelete();
        }}
        {...props}
      >
        <Trash className="size-4" />
        <span className="">Delete</span>
      </LoadingButton>
    </InlineTooltip>
  );
};

export const useDeleteBookmark = () => {
  const refreshBookmarks = useRefreshBookmarks();
  const removeBookmark = useConvexMutation(api.bookmarks.mutations.remove);

  const action = useMutation({
    mutationFn: async (bookmarkId: string) => {
      return removeBookmark({ id: bookmarkId as Id<"bookmarks"> });
    },
    onSuccess: () => {
      refreshBookmarks();
    },
  });

  return action;
};
