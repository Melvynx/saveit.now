"use client";

import { Bookmark } from "@workspace/database";
import { Input } from "@workspace/ui/components/input";
import { XCircle } from "lucide-react";

import { DeleteButtonAction } from "../bookmark-pending";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";

interface BookmarkCardErrorProps {
  bookmark: Bookmark;
}

export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error: string };
  const domainName = new URL(bookmark.url).hostname;

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader
        height={HEADER_HEIGHT}
        className="flex items-center justify-center"
      >
        <div className="flex items-center justify-center flex-col gap-4 h-full">
          <XCircle className="text-muted-foreground size-10" />
          <DeleteButtonAction bookmarkId={bookmark.id}>
            Delete
          </DeleteButtonAction>
          <Input type="text" value={bookmark.url} className="max-w-xs" />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null}>
        <BookmarkCardTitle>Error</BookmarkCardTitle>
        <BookmarkCardDescription>{metadata.error}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
