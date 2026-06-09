"use client";

import { Bookmark } from "@workspace/database";
import { ReactNode } from "react";

import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import { BookmarkCardContent } from "./bookmark-card-content";
import { BookmarkCardDescription } from "./bookmark-card-description";
import { BookmarkCardHeader, HEADER_HEIGHT } from "./bookmark-card-header";
import { BookmarkCardTitle } from "./bookmark-card-title";

interface BookmarkCardBaseProps {
  bookmark: Bookmark;
  headerContent:
    | ReactNode
    | ((bounds: { width: number; height: number }) => ReactNode);
  showActions?: boolean;
  customHeight?: number;
  className?: string;
  headerClassName?: string;
  onHeaderClick?: () => void;
  title?: string;
  description?: string;
}

export const BookmarkCardBase = ({
  bookmark,
  headerContent,
  showActions = true,
  customHeight = HEADER_HEIGHT,
  className = "",
  headerClassName = "",
  onHeaderClick,
  title,
  description,
}: BookmarkCardBaseProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const displayTitle = title || domainName;
  const displayDescription = description || bookmark.title;

  return (
    <BookmarkCardContainer bookmark={bookmark} className={className}>
      <BookmarkCardHeader
        height={customHeight}
        className={headerClassName}
        onClick={onHeaderClick}
      >
        {(bounds) => (
          <>
            {typeof headerContent === "function"
              ? headerContent(bounds)
              : headerContent}
            {showActions && (
              <BookmarkCardActions
                url={bookmark.url}
                bookmarkId={bookmark.id}
                starred={bookmark.starred || false}
                read={bookmark.read || false}
                bookmarkType={bookmark.type}
              />
            )}
          </>
        )}
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>{displayTitle}</BookmarkCardTitle>
        <BookmarkCardDescription>{displayDescription}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};

// Re-export all modular components
export { BookmarkCardActions } from "./bookmark-card-actions";
export { BookmarkCardContainer } from "./bookmark-card-container";
export { BookmarkCardContent } from "./bookmark-card-content";
export { BookmarkCardDescription } from "./bookmark-card-description";
export { BookmarkCardHeader, HEADER_HEIGHT } from "./bookmark-card-header";
export { BookmarkCardTitle } from "./bookmark-card-title";
export type { BookmarkCardBaseProps };
