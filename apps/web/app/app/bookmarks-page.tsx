import { AlertExtensions } from "@/features/extensions/alert-extensions";
import { useSession } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardLoadMore,
  BookmarkCardPricing,
} from "./bookmark-card";
import { BookmarkHeader } from "./bookmark-header";
import { MentionFilterInputRef } from "./components/type-filter-input";
import { MoreResultsButton } from "./more-results-button";
import { SearchInput } from "./search-input";
import { useBookmarks } from "./use-bookmarks";

export function BookmarksPage() {
  const {
    bookmarks,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    query,
  } = useBookmarks();
  const session = useSession();
  const router = useRouter();
  const searchInputRef = useRef<MentionFilterInputRef>(null);

  useHotkeys("mod+k", (event) => {
    event.preventDefault();
    searchInputRef.current?.focus();
  });

  if (!session.isPending && !session.data?.user) {
    logger.debug("Redirecting unauthenticated user to signin");
    toast.error("You need to be logged in to access this page");
    router.push("/signin");
  }

  // @ts-expect-error - onboarding is not typed
  if (session.data?.user.onboarding === false) {
    router.push("/start");
  }

  return (
    <div
      className="flex w-screen flex-col gap-4 px-4 py-4 lg:px-12 mx-auto"
      style={{
        maxWidth: 3000,
      }}
    >
      <AlertExtensions />

      <BookmarkHeader />
      <SearchInput ref={searchInputRef} />
      <div
        className="grid gap-4 lg:gap-6 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] [&>*]:w-full place-items-start"
        style={
          {
            // "--card-height": "calc(var(--spacing) * 64)",
          }
        }
      >
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
            {!query && <BookmarkCardInput />}

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
            {!query && bookmarks.length > 10 && <BookmarkCardPricing />}
            {query && <MoreResultsButton />}
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
