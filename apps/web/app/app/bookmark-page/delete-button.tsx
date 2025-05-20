"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { Button } from "@workspace/ui/components/button";
import { Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useRefreshBookmarks } from "../use-bookmarks";
import { deleteBookmarkAction } from "./bookmarks.action";

export type DeleteButtonProps = { bookmarkId: string };

export const DeleteButton = (props: DeleteButtonProps) => {
  const refreshBookmark = useRefreshBookmarks();
  const router = useRouter();
  const action = useAction(deleteBookmarkAction, {
    onSuccess: () => {
      refreshBookmark();
      router.push("/app");
    },
  });

  return (
    <Button
      variant="destructive"
      onClick={() => {
        dialogManager.add({
          title: "Delete Bookmark",
          description: "Are you sure you want to delete this bookmark?",
          action: {
            label: "Delete",
            onClick: () => {
              action.execute({ bookmarkId: props.bookmarkId });
            },
          },
        });
      }}
    >
      <Trash className="size-4" />
      <span className="">Delete</span>
    </Button>
  );
};
