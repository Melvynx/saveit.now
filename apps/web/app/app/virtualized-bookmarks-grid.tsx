"use client";

import { useUserPlan } from "@/lib/auth/user-plan";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bookmark } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardLoadMore,
  BookmarkCardPricing,
} from "./bookmark-card";

type BookmarkItem = {
  id: string;
  type: "bookmark" | "input" | "pricing" | "loadMore";
  data?: Bookmark;
  originalIndex?: number;
};

interface VirtualizedBookmarksGridProps {
  bookmarks: Bookmark[];
  query?: string;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isPending: boolean;
}

export function VirtualizedBookmarksGrid({
  bookmarks,
  query,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isPending,
}: VirtualizedBookmarksGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const plan = useUserPlan();
  // Estimation intelligente de la largeur initiale basée sur l'écran (même logique que le CSS original)
  const [containerWidth, setContainerWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const windowWidth = window.innerWidth;
      const padding = windowWidth >= 1024 ? 96 : 32; // lg:px-12 vs px-4 (both sides)
      const maxWidth = 3000;
      return Math.min(windowWidth - padding, maxWidth);
    }
    return 1200;
  });
  const [lanes, setLanes] = useState(() => {
    // Calcul initial avec la vraie logique CSS Grid
    if (typeof window !== "undefined") {
      const windowWidth = window.innerWidth;
      const padding = windowWidth >= 1024 ? 96 : 32;
      const maxWidth = 3000;
      const initialWidth = Math.min(windowWidth - padding, maxWidth);
      const gap = windowWidth >= 1024 ? 24 : 16;
      const minCardWidth = 320;
      return Math.max(
        1,
        Math.floor((initialWidth + gap) / (minCardWidth + gap)),
      );
    }
    return 3;
  });

  // Prepare virtual items array (same as original logic)
  const virtualItems = useMemo(() => {
    const items: BookmarkItem[] = [];

    // Add input card if not searching
    if (!query) {
      items.push({ id: "input", type: "input" });
    }

    // Add bookmarks
    bookmarks.forEach((bookmark, i) => {
      items.push({
        id: bookmark.id,
        type: "bookmark",
        data: bookmark,
        originalIndex: i,
      });
    });

    // Add pricing card after 10 bookmarks (if not searching)
    if (!query && bookmarks.length > 10 && plan.name === "free") {
      // Insert pricing card at position after first 10 bookmarks
      const pricingIndex = Math.min(11, items.length);
      items.splice(pricingIndex, 0, { id: "pricing", type: "pricing" });
    }

    // Add load more card at the end if there are more than 10 bookmarks
    if (bookmarks.length > 10) {
      items.push({ id: "loadMore", type: "loadMore" });
    }

    return items;
  }, [bookmarks, plan.name, query]);

  // Replicate exact CSS Grid logic: repeat(auto-fill, minmax(20rem, 1fr)) with max-width 25rem
  const calculateLanes = useCallback((width: number) => {
    const minCardWidth = 320; // 20rem = 320px (minmax min value)
    const maxCardWidth = 400; // 25rem = 400px (max-width constraint)
    const gap = 16; // gap-4 = 1rem = 16px (default)
    const lgGap = 24; // lg:gap-6 = 1.5rem = 24px (large screens)

    // Use larger gap for larger screens (matching lg:gap-6)
    const actualGap = width >= 1024 ? lgGap : gap; // lg breakpoint is 1024px

    // CSS Grid auto-fill logic: fit as many minCardWidth as possible
    const availableWidth = width;
    const columnsBasedOnMin = Math.floor(
      (availableWidth + actualGap) / (minCardWidth + actualGap),
    );

    // But ensure cards don't exceed maxCardWidth
    const actualCardWidth =
      (availableWidth - (columnsBasedOnMin - 1) * actualGap) /
      columnsBasedOnMin;

    if (actualCardWidth > maxCardWidth) {
      // If cards would be too wide, increase columns until they fit max width
      const columnsBasedOnMax = Math.floor(
        (availableWidth + actualGap) / (maxCardWidth + actualGap),
      );
      return Math.max(1, columnsBasedOnMax);
    }

    return Math.max(1, columnsBasedOnMin);
  }, []);

  // Update lanes when container width changes
  useEffect(() => {
    const newLanes = calculateLanes(containerWidth);
    setLanes(newLanes);
  }, [containerWidth, calculateLanes]);

  // Set up virtualizer with proper lanes configuration
  const virtualizerGap = containerWidth >= 1024 ? 24 : 16; // lg:gap-6 vs gap-4
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 256, // Should match h-[var(--card-height)] = 16rem =   256px
    lanes: lanes,
    gap: virtualizerGap,
    overscan: 5,
  });

  // Handle infinite scroll - trigger when load more card is visible
  useEffect(() => {
    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;

      const visibleItems = virtualizer.getVirtualItems();
      if (visibleItems.length === 0) return;

      // Check if the loadMore card is visible
      const hasLoadMoreVisible = visibleItems.some((virtualItem) => {
        const item = virtualItems[virtualItem.index];
        return item && item.type === "loadMore";
      });

      if (hasLoadMoreVisible) {
        fetchNextPage();
      }
    };

    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [
    virtualizer,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    virtualItems,
  ]);

  // Measure container width immediately and on resize
  useEffect(() => {
    const updateContainerWidth = () => {
      if (parentRef.current) {
        const width = parentRef.current.getBoundingClientRect().width;
        setContainerWidth(width);
      } else {
        // Fallback: simulate the same container width as the original CSS
        // This accounts for px-4 py-4 lg:px-12 and max-width 3000
        const windowWidth = window.innerWidth;
        const padding = windowWidth >= 1024 ? 96 : 32; // lg:px-12 vs px-4 (both sides)
        const maxWidth = 3000;
        const fallbackWidth = Math.min(windowWidth - padding, maxWidth);
        setContainerWidth(fallbackWidth);
      }
    };

    // Immediate measurement
    updateContainerWidth();

    // ResizeObserver for future changes
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
      virtualizer.measure();
    });

    if (parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }

    // Window resize as backup
    window.addEventListener("resize", updateContainerWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContainerWidth);
    };
  }, [virtualizer]);

  // Initial width calculation on mount
  useEffect(() => {
    if (parentRef.current) {
      const width = parentRef.current.getBoundingClientRect().width;
      if (width > 0) {
        setContainerWidth(width);
      }
    }
  }, []);

  if (isPending) {
    return (
      <div
        className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:max-w-[25rem] [&>*]:w-full place-items-start"
        style={{
          // @ts-expect-error -- Original CSS custom property
          "--card-height": "18rem", // 288px to match bookmark cards
        }}
      >
        {Array.from({ length: query ? 2 : 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="bg-muted mb-[var(--grid-spacing)] h-72 rounded-md"
          />
        ))}
      </div>
    );
  }

  // Calculate card width ensuring no overflow
  const gap = containerWidth >= 1024 ? 24 : 16; // lg:gap-6 vs gap-4
  const maxCardWidth = 400; // 25rem = 400px max-width constraint

  // Ensure cards fit within container with proper gap spacing
  const availableWidthForCards = containerWidth - (lanes - 1) * gap;
  const calculatedCardWidth = availableWidthForCards / lanes;
  const cardWidth = Math.min(maxCardWidth, Math.max(320, calculatedCardWidth)); // Min 20rem, max 25rem

  return (
    <div
      ref={parentRef}
      className="w-full"
      style={{
        height: "calc(100vh - 200px)", // Prendre toute la hauteur disponible
        overflowY: "auto", // Seulement scroll vertical
        overflowX: "hidden", // Pas de scroll horizontal
        // @ts-expect-error -- CSS custom property for consistent card height
        "--card-height": "16rem", // 288px to match the bookmark cards
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index];
          if (!item) return null;

          const isFirstBookmark =
            query && item.type === "bookmark" && item.originalIndex === 0;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0"
              style={{
                left: `${virtualRow.lane * (cardWidth + gap)}px`,
                width: `${cardWidth}px`,
                height: "16rem", // Force height to 18rem = 288px
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-testid={`bookmark-card-${item.id}-${item.type}`}
            >
              <div
                className="w-full h-full overflow-hidden"
                style={{
                  // @ts-expect-error -- CSS custom property for child components
                  "--card-height": "16rem",
                }}
              >
                {item.type === "input" && <BookmarkCardInput />}

                {item.type === "pricing" && <BookmarkCardPricing />}

                {item.type === "loadMore" && (
                  <BookmarkCardLoadMore
                    loadNextPage={() => fetchNextPage()}
                    hasNextPage={hasNextPage || false}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                )}

                {item.type === "bookmark" && item.data && (
                  <>
                    {isFirstBookmark ? (
                      <div className="relative">
                        <Badge
                          variant="outline"
                          className="absolute -top-2 -left-2 z-50 rounded-lg bg-card"
                        >
                          <Sparkles className="size-4 text-primary" />
                          Best match
                        </Badge>
                        <BookmarkCard bookmark={item.data} />
                      </div>
                    ) : (
                      <BookmarkCard bookmark={item.data} />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
