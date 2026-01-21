"use client";

import { BookmarkCard, BookmarkCardLoadMore } from "app/app/bookmark-card";
import { SearchInput } from "app/app/search-input";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { BrowserRouter } from "react-router";
import { PublicBookmarkHeader } from "./public-bookmark-header";
import { usePublicBookmarks } from "./use-public-bookmarks";

type PublicBookmarksPageProps = {
  slug: string;
};

function PublicBookmarksContent({ slug }: PublicBookmarksPageProps) {
  const {
    bookmarks,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    query,
    user,
  } = usePublicBookmarks(slug);

  return (
    <div
      className="flex w-screen flex-col gap-4 px-4 py-4 lg:px-12 mx-auto"
      style={{
        maxWidth: 3000,
      }}
    >
      <PublicBookmarkHeader ownerName={user?.name} />
      <SearchInput />
      <div className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:w-full place-items-start">
        {isPending ? (
          <>
            {Array.from({ length: query ? 2 : 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="bg-muted mb-[var(--grid-spacing)] h-72 rounded-md"
              />
            ))}
          </>
        ) : (
          <>
            {bookmarks.map((bookmark, i) => {
              if (query && i === 0) {
                return (
                  <div className="relative" key={bookmark.id}>
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
            {bookmarks.length > 10 && (
              <BookmarkCardLoadMore
                loadNextPage={() => fetchNextPage()}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function PublicBookmarksPage({ slug }: PublicBookmarksPageProps) {
  return (
    <BrowserRouter>
      <PublicBookmarksContent slug={slug} />
    </BrowserRouter>
  );
}
