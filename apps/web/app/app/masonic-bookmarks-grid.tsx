"use client";

import { Bookmark } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Sparkles } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Masonry } from "masonic";
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
        originalIndex: i 
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
  const renderItem = useCallback(({ 
    data: item, 
    width 
  }: { 
    data: GridItem; 
    width: number; 
  }) => {
    switch (item.type) {
      case "input":
        return (
          <div style={{ width, height: 288, overflow: 'hidden' }}> {/* Fixed height like original */}
            <BookmarkCardInput />
          </div>
        );
        
      case "bookmark": {
        if (!item.bookmark) return null;
        const { bookmark, originalIndex } = item;
        
        if (query && originalIndex === 0) {
          return (
            <div style={{ width, height: 288, overflow: 'hidden' }} className="relative"> {/* Fixed height */}
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
        
        return (
          <div style={{ width, height: 288, overflow: 'hidden' }}> {/* Fixed height */}
            <BookmarkCard bookmark={bookmark} />
          </div>
        );
      }
      
      case "pricing":
        return (
          <div style={{ width, height: 288, overflow: 'hidden' }}> {/* Fixed height */}
            <BookmarkCardPricing />
          </div>
        );
        
      case "more-results":
        return (
          <div style={{ width, height: 288, overflow: 'hidden' }}> {/* Fixed height */}
            <MoreResultsButton />
          </div>
        );
        
      case "load-more":
        return (
          <div style={{ width, height: 288, overflow: 'hidden' }}> {/* Fixed height */}
            <BookmarkCardLoadMore
              loadNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          </div>
        );
        
      default:
        return null;
    }
  }, [query, fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="w-full" style={{ maxWidth: 3000 }}>
      <Masonry
        items={items}
        render={renderItem}
        columnWidth={320} // 20rem = 320px (same as minmax(20rem,1fr))
        columnGutter={16} // gap-4 = 1rem = 16px
        rowGutter={24} // gap-6 = 1.5rem = 24px (lg:gap-6)
        itemHeightEstimate={288} // Fixed card height = 18rem = 288px (same as original)
        className="w-full"
      />
    </div>
  );
}