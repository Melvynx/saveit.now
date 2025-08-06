"use client";

import { memo } from "react";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardImageProps {
  bookmark: BookmarkCardData;
}

const BookmarkCardImageComponent = ({ bookmark }: BookmarkCardImageProps) => {
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
          bookmarkType={bookmark.type}
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

export const BookmarkCardImage = memo(BookmarkCardImageComponent);
