"use client";

import { memo, useEffect, useMemo } from "react";
import { VirtuosoMasonry, type ItemContent } from "@virtuoso.dev/masonry";
import { Bookmark } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Sparkles } from "lucide-react";
import { useWindowSize } from "react-use";
import { BookmarkCard } from "./bookmark-card";

type VirtualizedBookmarksGridProps = {
  bookmarks: Bookmark[];
  query: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadNextPage: () => void;
};

const MIN_COLUMN_WIDTH_PX = 320;

const MemoBookmarkCard = memo(BookmarkCard);

function useNearEnd(loadMore: () => void, isEnabled: boolean) {
  useEffect(() => {
    if (!isEnabled) return;
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const scrollPos = window.scrollY + window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        if (docHeight - scrollPos < 800) loadMore();
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    handler();
    return () => {
      window.removeEventListener("scroll", handler as EventListener);
      window.removeEventListener("resize", handler as EventListener);
    };
  }, [isEnabled, loadMore]);
}

export function VirtualizedBookmarksGrid({
  bookmarks,
  query,
  hasNextPage,
  isFetchingNextPage,
  loadNextPage,
}: VirtualizedBookmarksGridProps) {
  const items = useMemo(() => bookmarks, [bookmarks]);
  const { width } = useWindowSize();
  const columnCount = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH_PX));

  useNearEnd(() => {
    if (hasNextPage && !isFetchingNextPage) loadNextPage();
  }, true);

  const Item: ItemContent<Bookmark, undefined> = ({ index, data }) => {
    if (query && index === 0) {
      return (
        <div className="relative">
          <Badge variant="outline" className="absolute -top-2 -left-2 z-50 rounded-lg bg-card">
            <Sparkles className="size-4 text-primary" />
            Best match
          </Badge>
          <MemoBookmarkCard bookmark={data} />
        </div>
      );
    }
    return <MemoBookmarkCard bookmark={data} />;
  };

  return (
    <VirtuosoMasonry<Bookmark, undefined>
      useWindowScroll
      columnCount={columnCount}
      data={items}
      ItemContent={Item}
    />
  );
}


