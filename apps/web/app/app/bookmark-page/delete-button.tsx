"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { Button, ButtonProps } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { useRefreshBookmarks } from "../use-bookmarks";
import { deleteBookmarkAction } from "./bookmarks.action";

export type DeleteButtonProps = { bookmarkId: string } & ButtonProps;

export const DeleteButton = ({ bookmarkId, ...props }: DeleteButtonProps) => {
  const action = useDeleteBookmark();

  const handleDelete = () => {
    dialogManager.add({
      title: "Delete Bookmark",
      description: "Are you sure you want to delete this bookmark?",
      action: {
        label: "Delete",
        onClick: () => {
          action.execute({ bookmarkId });
        },
      },
    });
  };

  useHotkeys("mod+d", () => {
    handleDelete();
  });

  return (
    <InlineTooltip title="Delete (⌘D)">
      <Button
        variant="destructive"
        onClick={() => {
          handleDelete();
        }}
        {...props}
      >
        <Trash className="size-4" />
        <span className="">Delete</span>
      </Button>
    </InlineTooltip>
  );
};

export const useDeleteBookmark = () => {
  const refreshBookmark = useRefreshBookmarks();
  const router = useRouter();
  const action = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      refreshBookmark();
      router.push("/app");
    },
  });

  return action;
};
