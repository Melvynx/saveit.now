"use client";

import { Bookmark } from "@workspace/database";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";

interface BookmarkCardImageProps {
  bookmark: Bookmark;
}

export const BookmarkCardImage = ({ bookmark }: BookmarkCardImageProps) => {
  const domainName = new URL(bookmark.url).hostname;

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="h-64 break-inside-avoid-column"
    >
      <BookmarkCardHeader
        className="h-full"
        style={{
          backgroundImage: `url(${bookmark.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <BookmarkCardActions
          url={bookmark.url}
          bookmarkId={bookmark.id}
          starred={bookmark.starred || false}
          read={bookmark.read || false}
          isBlog={bookmark.type === "BLOG"}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle className="text-sm">{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription className="text-xs line-clamp-1">
          {bookmark.title || "Image"}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
