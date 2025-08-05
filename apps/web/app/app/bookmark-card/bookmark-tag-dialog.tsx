"use client";

import { TagSelector } from "@/features/tags/tag-selector";
import { TagType } from "@workspace/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRefreshBookmarks } from "../use-bookmarks";
import { updateBookmarkCardTagsAction } from "./bookmarks-card.action";

type BookmarkTag = {
  tag: {
    id: string;
    name: string;
    type: TagType;
  };
};

type BookmarkTagDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark: {
    id: string;
    title: string | null;
    tags?: BookmarkTag[];
  };
};

export function BookmarkTagDialog({
  open,
  onOpenChange,
  bookmark,
}: BookmarkTagDialogProps) {
  const refreshBookmarks = useRefreshBookmarks();

  const { execute: updateTags, isExecuting } = useAction(
    updateBookmarkCardTagsAction,
    {
      onSuccess: () => {
        toast.success("Tags updated");
        refreshBookmarks();
      },
      onError: (error) => {
        toast.error(
          error.error.serverError?.message || "Failed to update tags",
        );
      },
    },
  );

  const tags = bookmark.tags?.map((t) => t.tag) || [];

  const handleTagsChange = (newTagNames: string[]) => {
    updateTags({ bookmarkId: bookmark.id, tags: newTagNames });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            {bookmark.title || "Untitled bookmark"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <TagSelector
            selectedTags={tags}
            onTagsChange={handleTagsChange}
            placeholder="Search or create tags..."
            disabled={isExecuting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
