"use client";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardImageProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardImage = ({ bookmark }: BookmarkCardImageProps) => {
  const domainName = new URL(bookmark.url).hostname;

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="break-inside-avoid-column border-black relative"
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
        bookmarkType={bookmark.type}
      />

      <BookmarkCardContent
        bookmark={bookmark}
        className="bg-black/30 backdrop-blur-xs absolute left-0 right-0 bottom-0 text-white pt-4"
      >
        <BookmarkCardTitle className="text-sm">
          {bookmark.title || "Image"}
        </BookmarkCardTitle>
        <BookmarkCardDescription className="text-xs line-clamp-1 text-foreground">
          {domainName}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
