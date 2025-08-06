"use client";

import { Bookmark } from "@workspace/database";
import { Masonry } from "masonic";
import { useCallback, useMemo } from "react";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardLoadMore,
  BookmarkCardPricing,
} from "./bookmark-card";
import { MoreResultsButton } from "./more-results-button";

type GridItem = {
  id: string;
  type: "input" | "bookmark" | "pricing" | "more-results" | "load-more";
  bookmark?: Bookmark;
  originalIndex?: number;
};

const CARD_HEIGHT = 256; // Fixed height for all cards

interface MasonicBookmarksGridProps {
  bookmarks: Bookmark[];
  query: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function MasonicBookmarksGrid({
  bookmarks,
  query,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: MasonicBookmarksGridProps) {
  // Calculate total items including special cards
  const items = useMemo(() => {
    const itemList: GridItem[] = [];

    // Add input card if no query
    if (!query) {
      itemList.push({ id: "input", type: "input" });
    }

    // Add bookmarks
    bookmarks.forEach((bookmark, i) => {
      itemList.push({
        id: bookmark.id,
        type: "bookmark",
        bookmark,
        originalIndex: i,
      });
    });

    // Add pricing card if conditions are met
    if (!query && bookmarks.length > 10) {
      itemList.push({ id: "pricing", type: "pricing" });
    }

    // Add more results button if query exists
    if (query) {
      itemList.push({ id: "more-results", type: "more-results" });
    }

    // Add load more card if there are enough bookmarks
    if (bookmarks.length > 10) {
      itemList.push({ id: "load-more", type: "load-more" });
    }

    return itemList;
  }, [bookmarks, query]);

  // Render each item based on type
  const renderItem = useCallback(
    ({ data: item }: { data: GridItem; width: number }) => {
      switch (item.type) {
        case "input":
          return <BookmarkCardInput />;

        case "bookmark": {
          if (!item.bookmark) return null;
          const { bookmark } = item;

          return <BookmarkCard bookmark={bookmark} />;
        }

        case "pricing":
          return <BookmarkCardPricing />;

        case "more-results":
          return <MoreResultsButton />;

        case "load-more":
          return (
            <BookmarkCardLoadMore
              loadNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          );

        default:
          return null;
      }
    },
    [query, fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  return (
    <div
      className="w-full"
      style={
        {
          maxWidth: 3000,
          "--card-height": `${CARD_HEIGHT}px`,
        } as React.CSSProperties
      }
    >
      <Masonry
        items={items}
        render={renderItem}
        columnWidth={320} // 20rem = 320px (same as minmax(20rem,1fr))
        columnGutter={16} // gap-4 = 1rem = 16px
        rowGutter={24} // gap-6 = 1.5rem = 24px (lg:gap-6)
        itemHeightEstimate={288} // Fixed card height = 18rem = 288px (same as original)
        className="w-full justify-start"
        style={{ justifyContent: "flex-start" }}
      />
    </div>
  );
}
