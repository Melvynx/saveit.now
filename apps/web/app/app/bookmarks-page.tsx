import { AlertExtensions } from "@/features/extensions/alert-extensions";
import { useSession } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { BookmarkHeader } from "./bookmark-header";
import { VirtualizedBookmarksGrid } from "./components/virtualized-bookmarks-grid";
import { MentionFilterInputRef } from "./components/type-filter-input";
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
      
      <VirtualizedBookmarksGrid
        bookmarks={bookmarks}
        query={query}
        isPending={isPending}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
