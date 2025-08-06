"use client";

import { Bookmark } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Sparkles } from "lucide-react";
import { forwardRef, useCallback, useMemo, useRef } from "react";
import {
  VirtuosoGrid,
  VirtuosoGridHandle,
  GridItemProps,
} from "react-virtuoso";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardLoadMore,
  BookmarkCardPricing,
} from "./bookmark-card";
import { MoreResultsButton } from "./more-results-button";

type GridItem =
  | { type: "input"; index: number }
  | { type: "bookmark"; bookmark: Bookmark; originalIndex: number; index: number }
  | { type: "pricing"; index: number }
  | { type: "more-results"; index: number }
  | { type: "load-more"; index: number };

interface VirtualizedBookmarksGridProps {
  bookmarks: Bookmark[];
  query: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

const GridContainer = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div
      ref={ref}
      className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:w-full place-items-start"
      style={{
        // @ts-expect-error CSS Variable not typed
        "--card-height": "calc(var(--spacing) * 64)",
      }}
      {...props}
    >
      {children}
    </div>
  )
);
GridContainer.displayName = "GridContainer";

const ItemWrapper = forwardRef<HTMLDivElement, GridItemProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props} className="w-full">
      {children}
    </div>
  )
);
ItemWrapper.displayName = "ItemWrapper";

export function VirtualizedBookmarksGrid({
  bookmarks,
  query,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: VirtualizedBookmarksGridProps) {
  const virtuosoRef = useRef<VirtuosoGridHandle>(null);
  
  // Calculate total items including special cards
  const items = useMemo(() => {
    const itemList: GridItem[] = [];
    let itemIndex = 0;
    
    // Add input card if no query
    if (!query) {
      itemList.push({ type: "input", index: itemIndex++ });
    }
    
    // Add bookmarks
    bookmarks.forEach((bookmark, i) => {
      itemList.push({ type: "bookmark", bookmark, originalIndex: i, index: itemIndex++ });
    });
    
    // Add pricing card if conditions are met
    if (!query && bookmarks.length > 10) {
      itemList.push({ type: "pricing", index: itemIndex++ });
    }
    
    // Add more results button if query exists
    if (query) {
      itemList.push({ type: "more-results", index: itemIndex++ });
    }
    
    // Add load more card if there are enough bookmarks
    if (bookmarks.length > 10) {
      itemList.push({ type: "load-more", index: itemIndex++ });
    }
    
    return itemList;
  }, [bookmarks, query]);
  
  const itemContent = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return null;
      
      switch (item.type) {
        case "input":
          return <BookmarkCardInput />;
          
        case "bookmark": {
          const { bookmark, originalIndex } = item;
          if (query && originalIndex === 0) {
            return (
              <div className="relative">
                <Badge
                  variant="outline"
                  className="absolute -top-2 -left-2 z-50 rounded-lg bg-card"
                >
                  <Sparkles className="size-4 text-primary" />
                  Best match
                </Badge>
                <BookmarkCard bookmark={bookmark} />
              </div>
            );
          }
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
    [items, query, fetchNextPage, hasNextPage, isFetchingNextPage]
  );
  
  return (
    <VirtuosoGrid
      ref={virtuosoRef}
      totalCount={items.length}
      components={{
        List: GridContainer,
        Item: ItemWrapper,
      }}
      itemContent={itemContent}
      overscan={200}
      style={{ height: "100%", width: "100%" }}
      useWindowScroll
    />
  );
}