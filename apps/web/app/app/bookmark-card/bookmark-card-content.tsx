"use client";

import { Bookmark } from "@workspace/database";
import { CardContent } from "@workspace/ui/components/card";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

import { BookmarkFavicon } from "../bookmark-favicon";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardContentProps {
  bookmark: Bookmark;
  children?: ReactNode;
  className?: string;
  href?: string | null;
}

export const BookmarkCardContent = ({
  bookmark,
  children,
  className = "",
  href,
}: BookmarkCardContentProps) => {
  const searchParams = useSearchParams();

  const content = (
    <CardContent className={`px-4 pb-4 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded border">
          <BookmarkFavicon
            faviconUrl={bookmark.faviconUrl}
            bookmarkType={bookmark.type ?? "PAGE"}
            status={bookmark.status}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">{children}</div>
      </div>
    </CardContent>
  );

  if (href === null) {
    return content;
  }

  return <LinkWithQuery to={`/app/b/${bookmark.id}`}>{content}</LinkWithQuery>;
};
