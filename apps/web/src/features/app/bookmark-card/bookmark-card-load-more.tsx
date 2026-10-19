"use client";

import { Button } from "@workspace/ui/components/button";
import { Loader } from "@workspace/ui/components/loader";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef } from "react";

interface BookmarkCardLoadMoreProps {
  loadNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  className?: string;
}

/**
 * Infinite-scroll sentinel placed after the results: loads the next page when
 * it scrolls into view, with a manual fallback button and an end marker.
 */
export function BookmarkCardLoadMore({
  loadNextPage,
  hasNextPage,
  isFetchingNextPage,
  className,
}: BookmarkCardLoadMoreProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadNextPage]);

  return (
    <div
      ref={loadMoreRef}
      className={cn(
        "col-span-full flex h-14 w-full items-center justify-center text-[13px] text-muted-foreground",
        className,
      )}
    >
      {isFetchingNextPage ? (
        <span className="flex items-center gap-2">
          <Loader className="size-3.5" />
          Loading more…
        </span>
      ) : hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={loadNextPage}
        >
          Load more
        </Button>
      ) : (
        <span className="flex items-center gap-3 text-muted-foreground/80">
          <span className="h-px w-10 bg-border" aria-hidden />
          That&apos;s everything
          <span className="h-px w-10 bg-border" aria-hidden />
        </span>
      )}
    </div>
  );
}
