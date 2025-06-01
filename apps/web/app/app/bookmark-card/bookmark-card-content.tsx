"use client";

import { Bookmark } from "@workspace/database";
import { CardContent } from "@workspace/ui/components/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

import { BookmarkFavicon } from "../bookmark-favicon";

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

  const defaultHref = href || {
    pathname: "/app",
    query: {
      ...Object.fromEntries(searchParams.entries()),
      b: bookmark.id,
    },
  };

  const content = (
    <CardContent className={`px-4 pb-4 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded border">
          <BookmarkFavicon
            faviconUrl={bookmark.faviconUrl}
            bookmarkType={bookmark.type ?? "PAGE"}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">{children}</div>
      </div>
    </CardContent>
  );

  if (href === null) {
    return content;
  }

  return <Link href={defaultHref}>{content}</Link>;
};
