"use client";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";
import { BookmarkCardTags } from "./bookmark-card-tags";

interface BookmarkCardImageProps {
  bookmark: BookmarkCardData;
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
          bookmarkType={bookmark.type}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle className="text-sm">{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription className="text-xs line-clamp-1">
          {bookmark.title || "Image"}
        </BookmarkCardDescription>
        {bookmark.tags && bookmark.tags.length > 0 && (
          <BookmarkCardTags
            bookmarkId={bookmark.id}
            tags={bookmark.tags.map((t) => t.tag)}
            className="mt-2"
          />
        )}
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
