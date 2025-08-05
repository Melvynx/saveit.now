"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { TagSelector } from "@/features/tags/tag-selector";
import { useAction } from "next-safe-action/hooks";
import { updateBookmarkCardTagsAction } from "./bookmarks-card.action";
import { useRefreshBookmarks } from "../use-bookmarks";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Hash } from "lucide-react";

type BookmarkTag = {
  tag: {
    id: string;
    name: string;
    type: "USER" | "IA";
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
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          error.error.serverError?.message || "Failed to update tags",
        );
      },
    },
  );

  const tags = bookmark.tags?.map((t) => t.tag) || [];
  const userTags = tags.filter((tag) => tag.type === "USER");
  const aiTags = tags.filter((tag) => tag.type === "IA");
  const allTagNames = tags.map((tag) => tag.name);

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

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Tags</h4>
            <div className="flex flex-wrap gap-2">
              {aiTags.length > 0 && (
                <div className="w-full space-y-1">
                  <p className="text-xs text-muted-foreground">AI Generated</p>
                  <div className="flex flex-wrap gap-1">
                    {aiTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-xs bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                      >
                        <Hash className="size-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {userTags.length > 0 && (
                <div className="w-full space-y-1">
                  <p className="text-xs text-muted-foreground">User Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {userTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        <Hash className="size-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags yet</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Edit Tags</h4>
            <TagSelector
              selectedTags={allTagNames}
              onTagsChange={handleTagsChange}
              placeholder="Search or create tags..."
              disabled={isExecuting}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
