import { AlertExtensions } from "@/features/extensions/alert-extensions";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@workspace/ui/components/badge";
import { Loader } from "@workspace/ui/components/loader";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookmarkCard,
  BookmarkCardInput,
  BookmarkCardPricing,
} from "./bookmark-card";
import { BookmarkHeader } from "./bookmark-header";
import { MoreResultsButton } from "./more-results-button";
import { SearchInput } from "./search-input";
import { useBookmarks } from "./use-bookmarks";
import { VirtualizedBookmarksGrid } from "./virtualized-bookmarks-grid";

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

  if (session.isPending) {
    return <Loader />;
  }

  if (!session.data?.session) {
    toast.error("You need to be logged in to access this page");
    router.push("/signin");
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
      <SearchInput />
      
      <VirtualizedBookmarksGrid
        bookmarks={bookmarks}
        query={query}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isPending={isPending}
      />
      
      {/* Keep these for query results */}
      {query && <MoreResultsButton />}
    </div>
  );
}
