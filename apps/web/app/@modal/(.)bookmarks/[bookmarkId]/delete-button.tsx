"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { Button } from "@workspace/ui/components/button";
import { Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { deleteBookmarkAction } from "./bookmarks.action";

export type DeleteButtonProps = { bookmarkId: string };

export const DeleteButton = (props: DeleteButtonProps) => {
  const action = useAction(deleteBookmarkAction);

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
