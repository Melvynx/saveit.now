import { BookmarkLimitUpgradeCard } from "@/features/upgrade/bookmark-limit-upgrade-card";
import type { BookmarkCardData } from "./bookmark-card/bookmark.types";
import { useSession } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import {
  useLocation,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BookmarkCardLoadMore } from "./bookmark-card";
import { AddBookmarkCard } from "./add-bookmark-card";
import { URL_SCHEMA } from "./schema";
import { BookmarkDialog } from "./bookmark-page/bookmark-page";
import { useCommandPalette } from "./command-palette/command-palette-provider";
import { LibraryBulkPill } from "./library/library-bulk-pill";
import { LibraryCardProvider } from "./library/library-card-context";
import {
  LibraryFirstRunState,
  LibrarySearchErrorState,
} from "./library/library-empty-state";
import { LibraryList } from "./library/library-list";
import { LibraryMasonry } from "./library/library-masonry";
import { FADE } from "./library/motion";
import { PostSaveTags } from "./library/post-save-tags";
import {
  type LibraryView,
  useLibraryPreferences,
} from "./library/library-preferences";
import { SortMenu, ViewSwitcher } from "./library/library-view-controls";
import { QuickAddField } from "./library/quick-add-field";
import { RediscoverStrip } from "./library/rediscover-strip";
import { useLibrarySelection } from "./library/selection-store";
import { useLibraryKeyboard } from "./library/use-library-keyboard";
import { usePasteToSave } from "./library/use-paste-to-save";
import { BroadenMatchesButton } from "./search/broaden-matches-button";
import { FilterBar } from "./search/filter-bar";
import { SearchEmptyState } from "./search/search-empty-state";
import { SearchResultsHeader } from "./search/search-results-header";
import { SearchInput, type SearchInputRef } from "./search-input";
import { PageHeader } from "./shell/page-header";
import { TYPE_NAV } from "./shell/sidebar-nav";
import { useSidebarCounts } from "./shell/use-sidebar-counts";
import { useBookmarks } from "./use-bookmarks";

const SPECIAL_TITLES: Record<string, string> = {
  STAR: "Starred",
  UNREAD: "Unread",
  READ: "Read",
};

function getLibraryTitle({
  query,
  types,
  tags,
  special,
}: {
  query: string;
  types: string[];
  tags: string[];
  special: string[];
}) {
  if (query.trim()) return "Search";
  if (special.length === 1 && types.length === 0 && tags.length === 0) {
    return SPECIAL_TITLES[special[0]!] ?? "Library";
  }
  if (types.length === 1 && special.length === 0 && tags.length === 0) {
    return (
      TYPE_NAV.find((item) => item.search?.types === types[0])?.label ??
      "Library"
    );
  }
  if (tags.length === 1 && types.length === 0 && special.length === 0) {
    return `#${tags[0]}`;
  }
  if (types.length > 0 || tags.length > 0 || special.length > 0) {
    return "Filtered";
  }
  return "Library";
}

const EMPTY_BOOKMARKS: BookmarkCardData[] = [];

const sameItems = (a: BookmarkCardData[] | null, b: BookmarkCardData[]) =>
  a !== null &&
  a.length === b.length &&
  a.every((item, index) => item === b[index]);

export function BookmarksPage() {
  const session = useSession();
  const router = useRouter();
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useCommandPalette();
  const search = useSearch({ strict: false }) as {
    bookmarkId?: string;
    modal?: string;
  };
  const view = useLibraryPreferences((state) => state.view);
  const sort = useLibraryPreferences((state) => state.sort);
  const {
    bookmarks: rawBookmarks,
    isPending,
    isTyping,
    isBrowsing,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    query,
    types,
    tags,
    special,
    bookmarkCount,
    error: searchError,
    retrySearch,
  } = useBookmarks({ enabled: Boolean(session.data?.user), order: sort });
  const freshBookmarks = rawBookmarks as unknown as BookmarkCardData[];
  // While a filter, sort or query change is loading, keep the previous
  // results on screen (dimmed) instead of flashing a skeleton.
  const [settledBookmarks, setSettledBookmarks] = useState<
    BookmarkCardData[] | null
  >(null);
  if (!isPending && !sameItems(settledBookmarks, freshBookmarks)) {
    setSettledBookmarks(freshBookmarks);
  }
  const isRefreshing = isPending && settledBookmarks !== null;
  // `settledBookmarks` keeps one identity across renders with equal rows.
  const bookmarks = settledBookmarks ?? EMPTY_BOOKMARKS;
  const showSkeleton = isPending && settledBookmarks === null;
  const reduceMotion = useReducedMotion();
  const selectionCount = useLibrarySelection((state) => state.selectedIds.size);
  const sidebarCounts = useSidebarCounts();
  const searchInputRef = useRef<SearchInputRef>(null);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery !== "";
  const hasActiveFilters =
    types.length > 0 || tags.length > 0 || special.length > 0;
  const urlQuery = URL_SCHEMA.safeParse(trimmedQuery).success
    ? trimmedQuery
    : null;
  const isSearchMode = hasQuery && !urlQuery;
  // The counter can lag (or be missing) while the list already has rows.
  const isFirstRun =
    bookmarkCount === 0 &&
    !hasQuery &&
    !hasActiveFilters &&
    !isPending &&
    freshBookmarks.length === 0;
  const knownTotal = (() => {
    if (bookmarkCount === undefined || isPending) return undefined;
    if (bookmarkCount >= bookmarks.length) return bookmarkCount;
    return !hasNextPage && !isPending ? bookmarks.length : undefined;
  })();
  const title = getLibraryTitle({ query, types, tags, special });
  const overlayOpen = Boolean(search.bookmarkId) || palette.isOpen;

  const count = (() => {
    if (hasQuery) return undefined;
    if (!hasActiveFilters) return knownTotal;
    if (special.length === 1 && types.length === 0 && tags.length === 0) {
      if (!sidebarCounts || sidebarCounts.capped) return undefined;
      if (special[0] === "STAR") return sidebarCounts.starred;
      if (special[0] === "UNREAD") return sidebarCounts.unread;
    }
    if (isBrowsing && !isPending && !hasNextPage) return bookmarks.length;
    return undefined;
  })();

  const filterKey = `${trimmedQuery}|${types.join()}|${tags.join()}|${special.join()}`;
  const clearSelection = useLibrarySelection((state) => state.clear);
  const setOrderedIds = useLibrarySelection((state) => state.setOrderedIds);
  const orderedIds = useMemo(
    () => bookmarks.map((bookmark) => bookmark.id),
    [bookmarks],
  );

  useEffect(() => {
    setOrderedIds(orderedIds);
  }, [orderedIds, setOrderedIds]);

  useEffect(() => {
    clearSelection();
  }, [filterKey, clearSelection]);

  useEffect(() => () => clearSelection(), [clearSelection]);

  useLibraryKeyboard({ bookmarks, enabled: !overlayOpen });
  usePasteToSave({ enabled: !overlayOpen });

  useEffect(() => {
    if (
      !session.isPending &&
      !session.data?.user &&
      search.modal !== "signin"
    ) {
      logger.debug("Redirecting unauthenticated user to signin");
      toast.error("You need to be logged in to access this page");
      void navigate({ to: "/signin", search: { redirectUrl: "/app" } });
    }
  }, [navigate, search.modal, session.data?.user, session.isPending]);

  const closeBookmarkDialog = () => {
    if (location.maskedLocation) {
      router.history.back();
      return;
    }

    void router.navigate({
      to: "/app",
      search: (previous) => ({ ...previous, bookmarkId: undefined }) as any,
      replace: true,
    });
  };

  if (!session.isPending && !session.data?.user) {
    return null;
  }

  const showResults = !urlQuery && !isPending && bookmarks.length > 0;
  const resultsKey = urlQuery
    ? "add"
    : showSkeleton
      ? "skeleton"
      : searchError && bookmarks.length === 0
        ? "error"
        : bookmarks.length === 0
          ? "empty"
          : view;
  const showRediscover =
    !hasQuery && !hasActiveFilters && !isFirstRun && bookmarks.length > 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader
        title={title}
        count={count}
        actions={
          <>
            <SortMenu disabled={!isBrowsing} />
            <ViewSwitcher />
          </>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-2.5">
          <SearchInput
            ref={searchInputRef}
            isLoading={isSearchMode && (isPending || isTyping)}
          />
          <FilterBar />
        </div>
      </PageHeader>

      <LibraryCardProvider highlightQuery={isSearchMode ? query : null}>
        <div
          className={cn(
            "flex w-full min-w-0 flex-col gap-6 px-4 pt-2 pb-28 md:px-6",
          )}
          data-view={view}
        >
          <BookmarkLimitUpgradeCard bookmarkCount={bookmarkCount} />

          {isFirstRun ? (
            <LibraryFirstRunState />
          ) : (
            <>
              {!hasQuery ? <QuickAddField /> : null}
              {showRediscover ? <RediscoverStrip /> : null}
              {isSearchMode ? (
                <SearchResultsHeader
                  count={bookmarks.length}
                  hasMore={hasNextPage}
                  query={query}
                  isLoading={isPending || isTyping}
                />
              ) : null}

              <motion.div
                key={resultsKey}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }
                }
                animate={{ opacity: isRefreshing ? 0.5 : 1, y: 0 }}
                transition={FADE}
                aria-busy={isRefreshing || showSkeleton || undefined}
                className="min-w-0"
              >
                {urlQuery ? (
                  <AddBookmarkCard url={urlQuery} />
                ) : showSkeleton ? (
                  <LibrarySkeleton view={view} />
                ) : searchError && bookmarks.length === 0 ? (
                  <LibrarySearchErrorState onRetry={retrySearch} />
                ) : bookmarks.length === 0 ? (
                  isRefreshing ? null : (
                    <SearchEmptyState
                      query={isSearchMode ? query : ""}
                      hasFilters={hasActiveFilters}
                    />
                  )
                ) : view === "grid" ? (
                  <LibraryMasonry bookmarks={bookmarks} />
                ) : (
                  <LibraryList
                    bookmarks={bookmarks}
                    density={view}
                    groupByDate={!isSearchMode}
                  />
                )}
              </motion.div>

              {showResults && isSearchMode ? (
                <div className="flex justify-center">
                  <BroadenMatchesButton />
                </div>
              ) : null}
              {showResults && (hasNextPage || isFetchingNextPage || bookmarks.length > 10) ? (
                <BookmarkCardLoadMore
                  loadNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              ) : null}
            </>
          )}
        </div>
      </LibraryCardProvider>

      {/* Zero-height sticky dock: the pill and the tray float above the page. */}
      <div className="pointer-events-none sticky bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 mt-auto h-0">
        <PostSaveTags suppressed={selectionCount > 0} />
        <LibraryBulkPill bookmarks={bookmarks} />
      </div>

      {search.bookmarkId ? (
        <BookmarkDialog
          bookmarkId={search.bookmarkId}
          onClose={closeBookmarkDialog}
        />
      ) : null}
    </div>
  );
}

const SKELETON_HEIGHTS = [260, 200, 300, 220, 180, 280, 240, 210];

function LibrarySkeleton({ view }: { view: LibraryView }) {
  if (view !== "grid") {
    return (
      <div className="flex flex-col" aria-hidden>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 px-2",
              view === "list" ? "h-14" : "h-8",
            )}
          >
            <Skeleton
              className={cn(
                "shrink-0 rounded-lg",
                view === "list" ? "size-8" : "size-5 rounded-md",
              )}
            />
            <Skeleton className="h-3.5 max-w-md flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(256px,1fr))] sm:gap-4"
      aria-hidden
    >
      {SKELETON_HEIGHTS.map((height, index) => (
        <Skeleton
          key={index}
          className="w-full rounded-xl"
          style={{ height }}
        />
      ))}
    </div>
  );
}
