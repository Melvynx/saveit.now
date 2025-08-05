"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Hash, Plus } from "lucide-react";
import { useState } from "react";
import { TagSelector } from "@/features/tags/tag-selector";
import { useAction } from "next-safe-action/hooks";
import { updateBookmarkCardTagsAction } from "./bookmarks-card.action";
import { useRefreshBookmarks } from "../use-bookmarks";
import { toast } from "sonner";

type Tag = {
  id: string;
  name: string;
  type: "USER" | "IA";
};

type BookmarkCardTagsProps = {
  bookmarkId: string;
  tags: Tag[];
  onTagsUpdate?: (tags: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function BookmarkCardTags({
  bookmarkId,
  tags,
  onTagsUpdate,
  disabled,
  className,
}: BookmarkCardTagsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const refreshBookmarks = useRefreshBookmarks();

  const { execute: updateTags, isExecuting } = useAction(
    updateBookmarkCardTagsAction,
    {
      onSuccess: () => {
        toast.success("Tags updated");
        refreshBookmarks();
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(
          error.error.serverError?.message || "Failed to update tags",
        );
      },
    },
  );

  const userTags = tags.filter((tag) => tag.type === "USER");
  const aiTags = tags.filter((tag) => tag.type === "IA");
  const allTagNames = tags.map((tag) => tag.name);

  const handleTagsChange = (newTagNames: string[]) => {
    if (onTagsUpdate) {
      onTagsUpdate(newTagNames);
    } else {
      updateTags({ bookmarkId, tags: newTagNames });
    }
  };

  if (isEditing && !disabled) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">
          <TagSelector
            selectedTags={allTagNames}
            onTagsChange={handleTagsChange}
            placeholder="Select tags..."
            disabled={disabled || isExecuting}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {aiTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="text-xs h-5 px-2 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
        >
          <Hash className="size-2.5 mr-1" />
          {tag.name}
        </Badge>
      ))}

      {userTags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="text-xs h-5 px-2">
          <Hash className="size-2.5 mr-1" />
          {tag.name}
        </Badge>
      ))}

      {!disabled && (
        <Button
          size="icon"
          variant="ghost"
          className="size-5 rounded-full hover:bg-muted"
          onClick={() => setIsEditing(true)}
        >
          <Plus className="size-3" />
        </Button>
      )}
    </div>
  );
}
