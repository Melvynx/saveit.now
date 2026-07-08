"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { BookOpen, MoreHorizontal, RefreshCcw, Trash } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDeleteBookmark } from "./delete-button";

export type BookmarkMoreMenuProps = {
  bookmarkId: string;
  readUrl?: string;
};

export const BookmarkMoreMenu = ({
  bookmarkId,
  readUrl,
}: BookmarkMoreMenuProps) => {
  const posthog = usePostHog();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const deleteAction = useDeleteBookmark();
  const reprocess = useMutation(api.bookmarks.mutations.reprocess);

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
          deleteAction.execute(bookmarkId);
          void navigate({ to: "/app", search });
        },
      },
    });
  };

  const handleReprocess = () => {
    posthog.capture("bookmark+rebookmark", {
      bookmark_id: bookmarkId,
    });
    void reprocess({ id: bookmarkId as Id<"bookmarks"> });
  };

  useHotkeys("mod+d", () => {
    handleDelete();
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          data-testid="bookmark-more-menu"
        >
          <MoreHorizontal className="text-muted-foreground size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {readUrl && (
          <DropdownMenuItem asChild>
            <a href={readUrl} target="_blank" rel="noreferrer">
              <BookOpen className="size-4" />
              Read article
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleReprocess}
          data-testid="rebookmark-button"
        >
          <RefreshCcw className="size-4" />
          Re-bookmark
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash className="size-4" />
          Delete
          <span className="text-muted-foreground ml-auto text-xs">⌘D</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
