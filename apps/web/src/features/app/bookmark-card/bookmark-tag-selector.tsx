"use client";

import { TagSelector } from "@/features/tags/tag-selector";
import { cn } from "@workspace/ui/lib/utils";
import { useBookmarkTags } from "../hooks/use-bookmark-tags";

interface BookmarkTagSelectorProps {
  bookmarkId: string;
  disabled?: boolean;
  placeholder?: string;
  showLimits?: number;
  className?: string;
}

export function BookmarkTagSelector({
  bookmarkId,
  disabled = false,
  placeholder = "Add tags...",
  showLimits,
  className,
}: BookmarkTagSelectorProps) {
  const { tags, isLoading, isUpdating, updateTags } =
    useBookmarkTags(bookmarkId);

  const isDisabled = disabled || isLoading || isUpdating;

  const handleTagsChange = (newTagNames: string[]) => {
    updateTags(newTagNames);
  };

  const getPlaceholder = () => {
    if (isLoading) return "Loading tags...";
    if (isUpdating) return "Updating tags...";
    return placeholder;
  };

  return (
    <div className={cn(className)}>
      <TagSelector
        selectedTags={tags}
        onTagsChange={handleTagsChange}
        disabled={isDisabled}
        placeholder={getPlaceholder()}
        showLimits={showLimits}
      />
    </div>
  );
}