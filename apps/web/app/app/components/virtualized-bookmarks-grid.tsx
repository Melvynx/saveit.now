"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Bookmark } from "@workspace/database";
import { Sparkles } from "lucide-react";
import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardLoadMore,
  BookmarkCardPricing,
} from "../bookmark-card";
import { MoreResultsButton } from "../more-results-button";

interface VirtualizedBookmarksGridProps {
  bookmarks: Bookmark[];
  query?: string;
  isPending: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

// Memoized bookmark card with best match handling
const VirtualizedBookmarkCard = memo(({ bookmark, isFirstResult, query }: {
  bookmark: Bookmark;
  isFirstResult: boolean;
  query?: string;
}) => {
  if (query && isFirstResult) {
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
});

VirtualizedBookmarkCard.displayName = "VirtualizedBookmarkCard";

// Hook to calculate responsive column count
const useResponsiveColumns = () => {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const calculateColumns = () => {
      const containerWidth = Math.min(window.innerWidth - 96, 3000); // Account for padding and max width
      const minColumnWidth = 320; // 20rem in pixels
      const gap = window.innerWidth >= 1024 ? 24 : 16; // lg:gap-6 vs gap-4
      
      const newColumns = Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)));
      setColumns(newColumns);
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  return columns;
};

export function VirtualizedBookmarksGrid({
  bookmarks,
  query,
  isPending,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: VirtualizedBookmarksGridProps) {
  const columns = useResponsiveColumns();

  // Create the grid items array including special components
  const gridItems = useMemo(() => {
    if (isPending) {
      // Return skeleton items for loading state
      return Array.from({ length: query ? 2 : 12 }, (_, i) => ({
        id: `skeleton-${i}`,
        type: 'skeleton' as const,
      }));
    }

    const items: Array<{
      id: string;
      type: 'input' | 'bookmark' | 'pricing' | 'moreResults' | 'loadMore';
      bookmark?: Bookmark;
      isFirstResult?: boolean;
    }> = [];

    // Add input card when not searching
    if (!query) {
      items.push({ id: 'input', type: 'input' });
    }

    // Add bookmark items
    bookmarks.forEach((bookmark, index) => {
      items.push({
        id: bookmark.id,
        type: 'bookmark',
        bookmark,
        isFirstResult: query ? index === 0 : false,
      });
    });

    // Add pricing card for non-search views with many bookmarks
    if (!query && bookmarks.length > 10) {
      items.push({ id: 'pricing', type: 'pricing' });
    }

    // Add more results button for search
    if (query) {
      items.push({ id: 'moreResults', type: 'moreResults' });
    }

    // Add load more component for infinite scroll
    if (bookmarks.length > 10) {
      items.push({ id: 'loadMore', type: 'loadMore' });
    }

    return items;
  }, [bookmarks, query, isPending]);

  // Group items into rows based on column count
  const gridRows = useMemo(() => {
    const rows: Array<typeof gridItems> = [];
    for (let i = 0; i < gridItems.length; i += columns) {
      rows.push(gridItems.slice(i, i + columns));
    }
    return rows;
  }, [gridItems, columns]);

  const RowComponent = useCallback((index: number) => {
    const row = gridRows[index];
    if (!row) return null;

    return (
      <div
        className="grid [&>*]:w-full place-items-start"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: window.innerWidth >= 1024 ? 24 : 16,
          '--card-height': 'calc(var(--spacing) * 64)',
          marginBottom: window.innerWidth >= 1024 ? 24 : 16,
        } as React.CSSProperties}
      >
        {row.map((item) => {
          if (item.type === 'skeleton') {
            return (
              <Skeleton 
                key={item.id}
                className="bg-muted h-72 rounded-md" 
              />
            );
          }

          switch (item.type) {
            case 'input':
              return <BookmarkCardInput key={item.id} />;

            case 'bookmark':
              return (
                <VirtualizedBookmarkCard
                  key={item.id}
                  bookmark={item.bookmark!}
                  isFirstResult={item.isFirstResult || false}
                  query={query}
                />
              );

            case 'pricing':
              return <BookmarkCardPricing key={item.id} />;

            case 'moreResults':
              return <MoreResultsButton key={item.id} />;

            case 'loadMore':
              return (
                <BookmarkCardLoadMore
                  key={item.id}
                  loadNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              );

            default:
              return null;
          }
        })}
        
        {/* Fill empty slots in the last row with empty divs to maintain grid layout */}
        {row.length < columns && 
          Array.from({ length: columns - row.length }, (_, i) => (
            <div key={`empty-${i}`} />
          ))
        }
      </div>
    );
  }, [gridRows, columns, query, fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (gridItems.length === 0) {
    return null;
  }

  return (
    <Virtuoso
      useWindowScroll
      totalCount={gridRows.length}
      itemContent={RowComponent}
      overscan={2} // Render 2 rows outside viewport for smooth scrolling
      endReached={() => {
        // Trigger fetchNextPage when reaching the end, similar to the existing infinite scroll
        if (hasNextPage && !isFetchingNextPage && bookmarks.length > 0) {
          fetchNextPage();
        }
      }}
      increaseViewportBy={{ top: 200, bottom: 600 }} // Preload content before it becomes visible
    />
  );
}