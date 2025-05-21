import { LoadMore } from "@/components/load-more";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BookmarkCard } from "./bookmark-card";
import { BookmarkHeader } from "./bookmark-header";
import { BookmarkInput } from "./bookmark-input";
import { BookmarkPricing } from "./bookmark-pricing";
import { SearchInput } from "./search-input";
import { useBookmarks } from "./use-bookmarks";

export function BookmarksPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const debounceQuery = useDebounce(query);

  const {
    bookmarks,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBookmarks(debounceQuery);

  return (
    <div
      className="flex w-screen flex-col gap-4 px-4 py-4 lg:px-12 mx-auto"
      style={{
        maxWidth: 3000,
      }}
    >
      <BookmarkHeader />
      <SearchInput />
      <div
        className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fit,minmax(20rem,25rem))]"
        style={{
          // @ts-expect-error
          "--card-height": "calc(var(--spacing) * 64)",
        }}
      >
        {isPending ? (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="bg-muted mb-[var(--grid-spacing)] h-72 rounded-md"
              />
            ))}
          </>
        ) : (
          <>
            {!query && <BookmarkInput />}
            {bookmarks.map((bookmark, i) => {
              console.log({ query, i });
              if (query && i === 0) {
                return (
                  <div className="relative">
                    <Badge
                      variant="outline"
                      className="absolute -top-2 -left-2 z-50 rounded-lg bg-card"
                    >
                      <Sparkles className="size-4 text-primary" />
                      Best match
                    </Badge>
                    <BookmarkCard bookmark={bookmark} key={bookmark.id} />
                  </div>
                );
              }

              return <BookmarkCard bookmark={bookmark} key={bookmark.id} />;
            })}
            {!query && <BookmarkPricing />}
          </>
        )}
      </div>
      <LoadMore
        loadNextPage={() => fetchNextPage()}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}
