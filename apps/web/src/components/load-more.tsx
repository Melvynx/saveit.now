import { Loader } from "@workspace/ui/components/loader";
import { useEffect, useRef } from "react";

interface LoadMoreProps {
  loadNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export const LoadMore = ({
  loadNextPage,
  hasNextPage,
  isFetchingNextPage,
}: LoadMoreProps) => {
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

  return (
    <div
      ref={loadMoreRef}
      className="text-muted-foreground flex h-10 w-full items-center justify-center text-sm"
    >
      {isFetchingNextPage ? (
        <Loader />
      ) : hasNextPage ? (
        <div className="h-10 w-full" />
      ) : (
        <span>No more bookmarks to load</span>
      )}
    </div>
  );
};
