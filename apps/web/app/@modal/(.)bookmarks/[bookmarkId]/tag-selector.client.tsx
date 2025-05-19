"use client";

import { TagSelector } from "@/features/tags/tag-selector";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateBookmarkTagsAction } from "./bookmarks.action";

export type TagSelectorClientProps = {
  tags: string[];
  bookmarkId: string;
};

export const TagSelectorClient = (props: TagSelectorClientProps) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(props.tags);

  const action = useAction(updateBookmarkTagsAction, {
    onSuccess: (data) => {
      setSelectedTags(data.data?.tags ?? []);
    },
  });

  return (
    <TagSelector
      selectedTags={selectedTags}
      onTagsChange={(tags) => {
        action.execute({ bookmarkId: props.bookmarkId, tags });
      }}
    />
  );
};
