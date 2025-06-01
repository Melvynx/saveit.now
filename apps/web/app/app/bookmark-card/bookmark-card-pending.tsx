"use client";

import { Bookmark } from "@workspace/database";

import {
  useBookmarkMetadata,
  useBookmarkToken,
} from "../bookmark-page/use-bookmark";
import { DeleteButtonAction } from "../bookmark-pending";
import BookmarkProgress from "../bookmark-progress";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";

interface BookmarkCardPendingProps {
  bookmark: Bookmark;
}

export const BookmarkCardPending = ({ bookmark }: BookmarkCardPendingProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const token = useBookmarkToken(bookmark.id);
  const pageMetadata = useBookmarkMetadata(bookmark.id);

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader>
        <div className="bg-border flex h-44 w-full flex-col items-center justify-center gap-4 rounded-md object-cover object-top">
          {token.data ? (
            <BookmarkProgress token={token.data.token} />
          ) : (
            <p>Loading...</p>
          )}
          <DeleteButtonAction bookmarkId={bookmark.id} />
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark} href={null} className="p-4">
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>
          {pageMetadata.data?.title ?? "Processing..."}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
