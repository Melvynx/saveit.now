"use client";

import { Bookmark } from "@workspace/database";
import { Input } from "@workspace/ui/components/input";
import { AlertCircle, Trash2 } from "lucide-react";

import { Typography } from "@workspace/ui/components/typography";
import { ReBookmarkButton } from "../bookmark-page/bookmark-actions-button";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";
import { DeleteButtonAction } from "./bookmark-card-pending";

interface BookmarkCardErrorProps {
  bookmark: Bookmark;
}

export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error: string };

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader
        height={HEADER_HEIGHT}
        className="flex items-center justify-center"
      >
        <div className="flex items-center justify-center flex-col gap-4 h-full p-4">
          <div className="flex items-center gap-2 ">
            <AlertCircle className="size-4" />
            <Typography variant="small">Failed to Load</Typography>
          </div>

          <div className="flex items-center gap-2">
            <ReBookmarkButton bookmarkId={bookmark.id}>
              Rebookmark
            </ReBookmarkButton>

            <DeleteButtonAction bookmarkId={bookmark.id}>
              <Trash2 className="size-4 mr-2" />
              Delete
            </DeleteButtonAction>
          </div>

          <Input type="text" value={bookmark.url} readOnly />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null}>
        <BookmarkCardTitle>Error Details</BookmarkCardTitle>
        <BookmarkCardDescription>{metadata.error}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
