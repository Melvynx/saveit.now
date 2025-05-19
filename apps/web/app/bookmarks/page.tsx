"use client";

import { LoadMore } from "@/components/load-more";
import { useDebounce } from "@/hooks/use-debounce";
import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bookmark } from "@workspace/database";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useSearchParams } from "next/navigation";
import { BookmarkCard } from "./bookmark-card";
import { URL_SCHEMA } from "./schema";
import { SearchInput } from "./search-input";

export default function RoutePage() {
  const searchParams = useSearchParams();

  const query = searchParams.get("query") ?? "";
  const debounceQuery = useDebounce(query);

  const data = useInfiniteQuery({
    queryKey: ["bookmarks", debounceQuery],
    queryFn: async ({ pageParam }) => {
      if (URL_SCHEMA.safeParse(debounceQuery).success) {
        return {
          bookmarks: [],
        };
      }

      const result = await upfetch("/api/bookmarks", {
        params: {
          query: debounceQuery,
          limit: 20,
          cursor: pageParam || undefined,
        },
      });

      const json = result as { bookmarks: Bookmark[] };

      return json;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.bookmarks.length > 0
        ? lastPage.bookmarks[lastPage.bookmarks.length - 1]?.id
        : undefined;
    },
    initialPageParam: "",
  });

  const bookmarks = data.data?.pages.flatMap((page) => page.bookmarks) ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-12 py-4 lg:py-8 w-screen">
      <SearchInput />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
        {data.isPending
          ? Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-72 mb-[var(--grid-spacing)] bg-muted rounded-md"
              />
            ))
          : bookmarks.map((bookmark) => (
              <BookmarkCard bookmark={bookmark} key={bookmark.id} />
            ))}
      </div>
      <LoadMore
        loadNextPage={() => data.fetchNextPage()}
        hasNextPage={data.hasNextPage}
        isFetchingNextPage={data.isFetchingNextPage}
      />
    </div>
  );
}
