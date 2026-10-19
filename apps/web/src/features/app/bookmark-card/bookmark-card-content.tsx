"use client";

import { BookmarkStatus, BookmarkType } from "@/lib/bookmark-types";
import { CardContent } from "@workspace/ui/components/card";
import { ReactNode } from "react";

import { BookmarkFavicon } from "../bookmark-favicon";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardContentProps {
  bookmark: {
    id: string;
    url: string;
    status: BookmarkStatus;
    faviconUrl: string | null;
    type: BookmarkType | null;
  };
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
  const content = (
    <CardContent className={`px-3.5 py-3 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <BookmarkFavicon
            faviconUrl={bookmark.faviconUrl}
            bookmarkType={bookmark.type ?? "PAGE"}
            status={bookmark.status}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      </div>
    </CardContent>
  );

  if (href === null) {
    return content;
  }

  return <LinkWithQuery to={`/app/b/${bookmark.id}`}>{content}</LinkWithQuery>;
};
