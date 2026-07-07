"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { LoadingButton } from "@/features/form/loading-button";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { ButtonProps } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Trash } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

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
          action.execute(bookmarkId);
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
  const removeBookmark = useMutation(api.bookmarks.mutations.remove);
  const [isPending, setIsPending] = useState(false);

  const execute = (bookmarkId: string) => {
    setIsPending(true);
    void removeBookmark({ id: bookmarkId as Id<"bookmarks"> }).finally(() =>
      setIsPending(false),
    );
  };

  return { execute, isPending };
};
