import { LoadMore } from "@/components/load-more";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useSearchParams } from "next/navigation";
import { BookmarkCard } from "./bookmark-card";
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
    <div className="flex w-screen flex-col gap-4 px-4 py-4 lg:px-12 lg:py-8">
      <SearchInput />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 2xl:grid-cols-5">
        {isPending
          ? Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="bg-muted mb-[var(--grid-spacing)] h-72 rounded-md"
              />
            ))
          : bookmarks.map((bookmark) => (
              <BookmarkCard bookmark={bookmark} key={bookmark.id} />
            ))}
      </div>
      <LoadMore
        loadNextPage={() => fetchNextPage()}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}
