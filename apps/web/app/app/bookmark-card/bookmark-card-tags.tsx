"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Hash, Plus } from "lucide-react";
import { useState } from "react";
import { BookmarkTagSelector } from "./bookmark-tag-selector";
import { useBookmarkTags } from "../hooks/use-bookmark-tags";

interface BookmarkCardTagsProps {
  bookmarkId: string;
  disabled?: boolean;
  className?: string;
  onEditComplete?: () => void;
}

export function BookmarkCardTags({
  bookmarkId,
  disabled,
  className,
  onEditComplete,
}: BookmarkCardTagsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { tags, isLoading } = useBookmarkTags(bookmarkId);

  const handleEditComplete = () => {
    setIsEditing(false);
    onEditComplete?.();
  };

  const userTags = tags.filter((tag) => tag.type === "USER");
  const aiTags = tags.filter((tag) => tag.type === "IA");

  if (isEditing && !disabled) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">
          <BookmarkTagSelector
            bookmarkId={bookmarkId}
            placeholder="Select tags..."
            disabled={disabled}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleEditComplete}>
          Done
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="h-5 w-16 bg-muted animate-pulse rounded"></div>
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
