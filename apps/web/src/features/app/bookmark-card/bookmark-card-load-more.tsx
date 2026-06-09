"use client";

import { Loader } from "@workspace/ui/components/loader";
import { Typography } from "@workspace/ui/components/typography";
import { ChevronDown, Package } from "lucide-react";
import { useEffect, useRef } from "react";

import { BookmarkStatus, BookmarkType } from "@workspace/database";
import {
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";

interface BookmarkCardLoadMoreProps {
  loadNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function BookmarkCardLoadMore({
  loadNextPage,
  hasNextPage,
  isFetchingNextPage,
}: BookmarkCardLoadMoreProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentElement = loadMoreRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [hasNextPage, isFetchingNextPage, loadNextPage]);

  // Mock bookmark object for the container
  const mockBookmark = {
    id: "load-more",
    url: "https://example.com",
    faviconUrl: null,
    status: "READY" as BookmarkStatus,
    type: "PAGE" as BookmarkType,
  };

  if (!hasNextPage && !isFetchingNextPage) {
    return (
      <BookmarkCardContainer bookmark={mockBookmark} ref={loadMoreRef}>
        <BookmarkCardHeader className="flex items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <Package className="text-muted-foreground size-12" />
            <div className="space-y-2">
              <Typography
                variant="large"
                className="text-muted-foreground font-semibold"
              >
                All caught up! 🎉
              </Typography>
              <Typography variant="muted" className="text-sm">
                No more bookmarks to load
              </Typography>
            </div>
          </div>
        </BookmarkCardHeader>

        <BookmarkCardContent bookmark={mockBookmark} href={null}>
          <BookmarkCardTitle className="text-muted-foreground">
            End of collection
          </BookmarkCardTitle>
          <BookmarkCardDescription className="text-muted-foreground">
            You've seen all your bookmarks
          </BookmarkCardDescription>
        </BookmarkCardContent>
      </BookmarkCardContainer>
    );
  }

  if (isFetchingNextPage) {
    return (
      <BookmarkCardContainer bookmark={mockBookmark} ref={loadMoreRef}>
        <BookmarkCardHeader className="flex items-center justify-center bg-primary/5">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <Loader className="text-primary" />
            <Typography variant="muted">Loading more bookmarks...</Typography>
          </div>
        </BookmarkCardHeader>

        <BookmarkCardContent bookmark={mockBookmark} href={null}>
          <BookmarkCardTitle className="text-primary">
            Loading...
          </BookmarkCardTitle>
          <BookmarkCardDescription>
            Fetching your next bookmarks
          </BookmarkCardDescription>
        </BookmarkCardContent>
      </BookmarkCardContainer>
    );
  }

  // Default state - ready to load more
  return (
    <BookmarkCardContainer bookmark={mockBookmark} ref={loadMoreRef}>
      <BookmarkCardHeader className="flex items-center justify-center bg-primary/5">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="animate-bounce">
            <ChevronDown className="text-primary size-8" />
          </div>
          <Typography variant="large" className="text-primary font-semibold">
            Load more bookmarks
          </Typography>
          <Typography variant="muted" className="text-sm">
            Scroll down to load more automatically
          </Typography>
        </div>
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={mockBookmark} href={null}>
        <BookmarkCardTitle className="text-primary">
          Ready to load
        </BookmarkCardTitle>
        <BookmarkCardDescription>
          More bookmarks available
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
}
