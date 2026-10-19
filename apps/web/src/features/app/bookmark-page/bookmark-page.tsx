import { InterceptDialog } from "@/components/intercept-dialog";
import { PageHeader } from "@/features/app/shell/page-header";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { SheetContent, SheetTitle } from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  BookmarkX,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import {
  ActionTooltip,
  BookmarkPageActions,
  BookmarkPanelActions,
} from "./bookmark-detail-toolbar";
import { type BookmarkDetailMode, getDomain } from "./bookmark-detail-utils";
import { BookmarkMetaPanel } from "./bookmark-meta-panel";
import { BookmarkReadingColumn } from "./bookmark-reading-column";
import {
  type BookmarkDetailActions,
  useBookmarkDetailActions,
} from "./use-bookmark-detail-actions";
import { useBookmark } from "./use-bookmark";
import { useLibraryStepper } from "./use-detail-navigation";

type BookmarkDetailProps = {
  bookmarkId: string;
  mode: BookmarkDetailMode;
  onClose?: () => void;
};

function useRecordOpen(bookmarkId: Id<"bookmarks"> | undefined) {
  const recordOpen = useMutation(api.bookmarks.mutations.recordOpen);
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookmarkId || recordedRef.current === bookmarkId) return;
    recordedRef.current = bookmarkId;
    void recordOpen({ id: bookmarkId }).catch(() => {
      // Open history is best effort; never block reading on it.
    });
  }, [bookmarkId, recordOpen]);
}

function DetailSkeleton({ mode }: { mode: BookmarkDetailMode }) {
  return (
    <div
      aria-busy="true"
      data-testid="bookmark-detail-skeleton"
      className={cn(
        "flex flex-col gap-8",
        mode === "page" &&
          "@min-[56rem]:grid @min-[56rem]:grid-cols-[minmax(0,720px)_300px] @min-[56rem]:justify-between @min-[56rem]:gap-12",
      )}
    >
      <span className="sr-only">Loading bookmark details</span>
      <div className="flex flex-col gap-6">
        <Skeleton className="aspect-[16/10] w-full rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="flex flex-col gap-2 border-l-2 border-border pl-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <BookmarkX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-serif text-2xl text-foreground">Bookmark not found</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        It was deleted or belongs to another account.
      </p>
      <Button variant="outline" size="sm" onClick={onBack} className="mt-1">
        Back to library
      </Button>
    </div>
  );
}

function DetailBody({
  bookmark,
  actions,
  mode,
}: {
  bookmark: BookmarkDetailDTO;
  actions: BookmarkDetailActions;
  mode: BookmarkDetailMode;
}) {
  if (mode === "dialog") {
    return (
      <div className="flex flex-col gap-8">
        <BookmarkReadingColumn bookmark={bookmark} actions={actions} mode={mode} />
        <BookmarkMetaPanel
          bookmark={bookmark}
          actions={actions}
          mode={mode}
          className="border-t border-border pt-6"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 @min-[56rem]:grid @min-[56rem]:grid-cols-[minmax(0,720px)_300px] @min-[56rem]:justify-between @min-[56rem]:gap-12">
      <BookmarkReadingColumn bookmark={bookmark} actions={actions} mode={mode} />
      <BookmarkMetaPanel
        bookmark={bookmark}
        actions={actions}
        mode={mode}
        className="border-t border-border pt-6 @min-[56rem]:sticky @min-[56rem]:top-19 @min-[56rem]:max-h-[calc(100dvh-6rem)] @min-[56rem]:self-start @min-[56rem]:-mx-2 @min-[56rem]:overflow-x-hidden @min-[56rem]:overflow-y-auto @min-[56rem]:border-t-0 @min-[56rem]:px-2 @min-[56rem]:pt-1 @min-[56rem]:pb-4"
      />
    </div>
  );
}

function PageLayout({
  bookmark,
  actions,
  state,
  onBack,
}: {
  bookmark: BookmarkDetailDTO | undefined;
  actions: BookmarkDetailActions;
  state: "loading" | "missing" | "ready";
  onBack: () => void;
}) {
  const title =
    state === "missing"
      ? "Not found"
      : bookmark
        ? bookmark.title || getDomain(bookmark.url)
        : "Bookmark";

  return (
    <>
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-1.5">
            <ActionTooltip label="Back to library">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Back to library"
                data-testid="back-button"
                className="-ml-1.5 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onBack}
              >
                <ArrowLeft />
              </Button>
            </ActionTooltip>
            <span className="truncate">{title}</span>
          </span>
        }
        actions={
          bookmark ? (
            <BookmarkPageActions bookmark={bookmark} actions={actions} />
          ) : null
        }
      />
      <div className="@container mx-auto w-full max-w-[1120px] px-4 pt-6 pb-24 md:px-6 md:pt-8">
        {state === "missing" ? (
          <NotFound onBack={onBack} />
        ) : bookmark ? (
          <DetailBody key={bookmark.id} bookmark={bookmark} actions={actions} mode="page" />
        ) : (
          <DetailSkeleton mode="page" />
        )}
      </div>
    </>
  );
}

function PanelLayout({
  bookmarkId,
  bookmark,
  actions,
  state,
  stepper,
  onClose,
}: {
  bookmarkId: string;
  bookmark: BookmarkDetailDTO | undefined;
  actions: BookmarkDetailActions;
  state: "loading" | "missing" | "ready";
  stepper: ((delta: 1 | -1) => void) | null;
  onClose: () => void;
}) {
  const title = bookmark?.title || (bookmark ? getDomain(bookmark.url) : "Bookmark");
  // Focusing the body (not the close button) keeps its tooltip from opening
  // and swallowing the first Escape.
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <InterceptDialog fallbackTo="/app" onClose={onClose}>
      <SheetContent
        side="right"
        showCloseButton={false}
        initialFocus={bodyRef}
        data-testid="bookmark-panel"
        className="w-full gap-0 bg-background p-0 duration-200 ease-(--ease-out-soft) data-[side=right]:w-full data-[side=right]:sm:max-w-[560px] motion-reduce:transition-none"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="flex h-13 shrink-0 items-center gap-0.5 border-b border-border px-3">
          <ActionTooltip label="Close" keys={["Esc"]}>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Close"
              data-testid="back-button"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X />
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Open full page">
            <Button
              asChild
              size="icon-sm"
              variant="ghost"
              aria-label="Open full page"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link
                to="/app/b/$bookmarkId"
                params={{ bookmarkId }}
                replace
                data-testid="open-full-page"
              >
                <Maximize2 />
              </Link>
            </Button>
          </ActionTooltip>
          {stepper ? <PanelStepper step={stepper} /> : null}
          <div className="flex-1" />
          {bookmark ? (
            <div className="flex items-center gap-0.5">
              <BookmarkPanelActions bookmark={bookmark} actions={actions} />
            </div>
          ) : null}
        </div>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
        >
          <div className="px-5 pt-5 pb-16 sm:px-6">
            {state === "missing" ? (
              <NotFound onBack={onClose} />
            ) : bookmark ? (
              <DetailBody key={bookmark.id} bookmark={bookmark} actions={actions} mode="dialog" />
            ) : (
              <DetailSkeleton mode="dialog" />
            )}
          </div>
        </div>
      </SheetContent>
    </InterceptDialog>
  );
}

function PanelStepper({ step }: { step: (delta: 1 | -1) => void }) {
  return (
    <div className="ml-1 hidden items-center gap-0.5 border-l border-border pl-1.5 sm:flex">
      <ActionTooltip label="Previous" keys={["K"]}>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Previous bookmark"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => step(-1)}
        >
          <ChevronUp />
        </Button>
      </ActionTooltip>
      <ActionTooltip label="Next" keys={["J"]}>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Next bookmark"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => step(1)}
        >
          <ChevronDown />
        </Button>
      </ActionTooltip>
    </div>
  );
}

function BookmarkDetail({ bookmarkId, mode, onClose }: BookmarkDetailProps) {
  const router = useRouter();
  const pathname = useLocation({ select: (location) => location.pathname });
  // Escape and the overlay both route through the dialog's onOpenChange and
  // the close button; run the parent's onClose once per open.
  const closedRef = useRef(false);
  const handleClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose?.();
  };

  const query = useBookmark(bookmarkId);
  const bookmark = (query.data?.bookmark ?? undefined) as
    | BookmarkDetailDTO
    | undefined;
  const state: "loading" | "missing" | "ready" =
    query.data === null ? "missing" : bookmark ? "ready" : "loading";

  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/app" });
  };

  const actions = useBookmarkDetailActions({
    bookmark,
    mode,
    onDeleted:
      mode === "dialog"
        ? handleClose
        : () => void router.navigate({ to: "/app", replace: true }),
  });

  const canStep = mode === "dialog" && pathname === "/app";
  const step = useLibraryStepper({ bookmarkId, enabled: canStep });
  useRecordOpen(bookmark?._id);

  if (mode === "page") {
    return (
      <PageLayout
        bookmark={bookmark}
        actions={actions}
        state={state}
        onBack={goBack}
      />
    );
  }

  return (
    <PanelLayout
      bookmarkId={bookmarkId}
      bookmark={bookmark}
      actions={actions}
      state={state}
      stepper={canStep ? step : null}
      onClose={handleClose}
    />
  );
}

type BookmarkDialogProps = {
  bookmarkId: string;
  onClose: () => void;
};

export function BookmarkDialog({ bookmarkId, onClose }: BookmarkDialogProps) {
  return <BookmarkDetail bookmarkId={bookmarkId} mode="dialog" onClose={onClose} />;
}

export function BookmarkPage({ bookmarkId }: { bookmarkId: string }): ReactNode {
  if (!bookmarkId) {
    return null;
  }

  return <BookmarkDetail bookmarkId={bookmarkId} mode="page" />;
}
