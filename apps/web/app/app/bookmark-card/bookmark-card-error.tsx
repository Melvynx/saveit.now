"use client";

import { Bookmark } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { AlertCircle, Trash2 } from "lucide-react";

import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";
import { DeleteButtonAction } from "./bookmark-card-pending";
import { ReBookmarkButton } from "../bookmark-page/bookmark-actions-button";

interface BookmarkCardErrorProps {
  bookmark: Bookmark;
}

export const BookmarkCardError = ({ bookmark }: BookmarkCardErrorProps) => {
  const metadata = bookmark.metadata as { error: string };

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader
        height={HEADER_HEIGHT}
        className="flex items-center justify-center bg-red-50 dark:bg-red-900/20"
      >
        <div className="flex items-center justify-center flex-col gap-4 h-full p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="size-8" />
            <span className="font-semibold text-lg">Failed to Load</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ReBookmarkButton bookmarkId={bookmark.id}>
              Rebookmark
            </ReBookmarkButton>
            
            <DeleteButtonAction bookmarkId={bookmark.id}>
              <Button size="sm" variant="destructive">
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            </DeleteButtonAction>
          </div>
          
          <Input 
            type="text" 
            value={bookmark.url} 
            className="max-w-xs text-sm bg-white dark:bg-gray-800 border-red-200 dark:border-red-800" 
            readOnly
          />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null}>
        <BookmarkCardTitle className="text-red-700 dark:text-red-300">
          Error Details
        </BookmarkCardTitle>
        <BookmarkCardDescription className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
          {metadata.error}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
