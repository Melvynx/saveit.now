"use client";

import { Button } from "@workspace/ui/components/button";
import { ExternalLink } from "lucide-react";
import { CopyLinkButton } from "../bookmark-page/bookmark-actions-button";
import { StarButton } from "../bookmark-page/star-button";
import { ReadButton } from "../bookmark-page/read-button";
import { ExternalLinkTracker } from "../external-link-tracker";

interface BookmarkCardActionsProps {
  bookmarkId: string;
  url: string;
  starred: boolean;
  read?: boolean;
  bookmarkType?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export const BookmarkCardActions = ({
  bookmarkId,
  url,
  starred,
  read = false,
  bookmarkType,
  className = "",
  children,
}: BookmarkCardActionsProps) => {
  return (
    <div
      className={`absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${className}`}
    >
      <ExternalLinkTracker
        bookmarkId={bookmarkId}
        url={url}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          size="icon"
          className="size-8 hover:bg-accent"
        >
          <ExternalLink className="text-muted-foreground size-4" />
        </Button>
      </ExternalLinkTracker>
      <CopyLinkButton
        url={url}
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
      />
      <StarButton
        bookmarkId={bookmarkId}
        starred={starred}
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
        showTooltip={false}
      />
      {(bookmarkType === "ARTICLE" || bookmarkType === "YOUTUBE") && (
        <ReadButton
          bookmarkId={bookmarkId}
          read={read}
          variant="secondary"
          size="icon"
          className="size-8 hover:bg-accent"
        />
      )}
      {children}
    </div>
  );
};
