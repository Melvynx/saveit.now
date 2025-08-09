"use client";

import { TagSelector } from "@/features/tags/tag-selector";
import { TagType } from "@workspace/database";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateBookmarkTagsAction } from "./bookmarks.action";

export type TagSelectorClientProps = {
  tags: { name: string; type: TagType; id: string }[];
  bookmarkId: string;
};

export const TagSelectorClient = (props: TagSelectorClientProps) => {
  const [selectedTags, setSelectedTags] = useState<{ name: string; type: TagType; id: string }[]>(props.tags);

  const action = useAction(updateBookmarkTagsAction, {
    onSuccess: (data) => {
      // Convert returned tags (strings) back to tag objects
      const tagNames = data.data?.tags ?? [];
      setSelectedTags(tagNames.map(name => ({ name, type: 'USER' as TagType, id: '' })));
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
