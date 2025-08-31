"use client";

import { BookmarkTagSelector } from "../bookmark-card/bookmark-tag-selector";

interface TagSelectorClientProps {
  bookmarkId: string;
}

export function TagSelectorClient({ bookmarkId }: TagSelectorClientProps) {
  return <BookmarkTagSelector bookmarkId={bookmarkId} />;
}
