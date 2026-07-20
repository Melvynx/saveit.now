import { InterceptDialog } from "@/components/intercept-dialog";
import { BookmarkTagSelector } from "@/features/app/bookmark-card/bookmark-tag-selector";
import { BookmarkFavicon } from "@/features/app/bookmark-favicon";
import { TranscriptViewer } from "@/features/bookmarks/transcript-viewer";
import { useSession } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { Typography } from "@workspace/ui/components/typography";
import { useMutation } from "convex/react";
import { ExternalLink, X } from "lucide-react";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { ExternalLinkTracker } from "../external-link-tracker";
import { CopyLinkButton, ShareButton } from "./bookmark-actions-button";
import { BookmarkHeroPreview } from "./bookmark-hero-preview";
import { BookmarkMoreMenu } from "./bookmark-more-menu";
import { BookmarkNote } from "./bookmark-note";
import { EditableText } from "./editable-text";
import { ReadButton } from "./read-button";
import { StarButton } from "./star-button";
import { useBookmark } from "./use-bookmark";

function hasMarkdownContent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return typeof m.markdown === "string" && m.markdown.length > 0;
}

function getEmbeddedText(bookmark: BookmarkDetailDTO): string | null {
  const title = bookmark.title?.trim() || "";
  const body = bookmark.vectorSummary?.trim() || bookmark.summary?.trim() || "";

  return [title, body].filter(Boolean).join("\n") || null;
}

function formatSavedDate(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <Typography
      variant="muted"
      className="text-[11px] font-medium tracking-wider uppercase"
    >
      {children}
    </Typography>
  );
};

function BookmarkDetailSkeletonContent() {
  return (
    <div
      aria-busy="true"
      data-testid="bookmark-detail-skeleton"
      className="flex h-full min-h-0 flex-col overflow-hidden md:grid md:grid-cols-[1.4fr_1fr]"
    >
      <span className="sr-only">Loading bookmark details</span>

      <div className="bg-muted/30 flex flex-col border-b md:min-h-0 md:border-r md:border-b-0">
        <Skeleton className="h-56 w-full rounded-none md:h-auto md:min-h-0 md:flex-1" />
        <div className="bg-background flex items-center gap-2 border-t px-4 py-2.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-28" />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="size-8 shrink-0" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="size-9 shrink-0" />
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

function BookmarkDetailSkeleton({
  renderMode,
  onClose,
}: Pick<BookmarkDetailProps, "renderMode" | "onClose">) {
  const content = <BookmarkDetailSkeletonContent />;

  if (renderMode === "page") {
    return (
      <main className="bg-muted/40 min-h-screen p-4">
        <section className="bg-background mx-auto h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-lg border">
          {content}
        </section>
      </main>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent
        disableClose
        className="flex flex-col gap-0 overflow-hidden p-0"
        style={{
          maxWidth: "min(calc(100vw - 32px), 1100px)",
          height: "min(calc(100vh - 32px), 680px)",
        }}
        onEscapeKeyDown={onClose}
      >
        <DialogTitle className="sr-only">Loading bookmark</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}

type BookmarkDialogProps = {
  bookmarkId: string;
  onClose: () => void;
};

export function BookmarkDialog({ bookmarkId, onClose }: BookmarkDialogProps) {
  return (
    <BookmarkDetail
      bookmarkId={bookmarkId}
      renderMode="dialog"
      onClose={onClose}
    />
  );
}

type BookmarkDetailProps = {
  bookmarkId: string;
  renderMode: "dialog" | "page";
  onClose?: () => void;
};

function BookmarkDetail({
  bookmarkId,
  renderMode,
  onClose,
}: BookmarkDetailProps) {
  // Escape triggers both the content keydown handler and the dialog's own
  // dismissal (onOpenChange) — guard so onClose runs once per open.
  const closedRef = useRef(false);
  const handleClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose?.();
  };
  const router = useRouter();
  const query = useBookmark(bookmarkId);
  const bookmark = query.data?.bookmark as BookmarkDetailDTO | undefined;
  const session = useSession();
  const updateBookmark = useMutation(api.bookmarks.mutations.update);
  const isAdmin =
    (session.data?.user as { role?: string } | undefined)?.role === "admin";

  useHotkeys("c", () => {
    if (!bookmark) return;
    window.navigator.clipboard.writeText(bookmark.url);
    toast.success("Copied to clipboard");
  });

  useHotkeys("o", () => {
    if (!bookmark) return;
    window.open(bookmark.url, "_blank");
  });

  if (!bookmark) {
    return (
      <BookmarkDetailSkeleton
        renderMode={renderMode}
        onClose={renderMode === "dialog" ? handleClose : undefined}
      />
    );
  }

  const metadata = bookmark.metadata as Record<string, unknown> | null;
  const transcript = metadata?.transcript as string | undefined;
  const embeddedText = isAdmin ? getEmbeddedText(bookmark) : null;
  const readUrl = hasMarkdownContent(bookmark.metadata)
    ? `/p/${bookmark.id}/read`
    : undefined;

  const closeDetail =
    renderMode === "dialog" ? handleClose : () => router.history.back();

  const content = (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto md:grid md:grid-cols-[1.4fr_1fr] md:overflow-hidden">
      {renderMode === "dialog" ? (
        <DialogTitle className="sr-only">
          {bookmark.title || "Bookmark details"}
        </DialogTitle>
      ) : (
        <h1 className="sr-only">{bookmark.title || "Bookmark details"}</h1>
      )}

      {/* Left pane — hero preview */}
      <div className="bg-muted/30 flex flex-col border-b md:min-h-0 md:border-r md:border-b-0">
        <div className="relative h-56 overflow-hidden md:h-auto md:min-h-0 md:flex-1">
          <BookmarkHeroPreview bookmark={bookmark} />
        </div>
        <div className="bg-background text-muted-foreground flex items-center gap-2 border-t px-4 py-2 text-xs">
          <span className="capitalize">
            {(bookmark.type ?? "page").toLowerCase()}
          </span>
          <span className="ml-auto">
            Saved {formatSavedDate(bookmark.createdAt)}
          </span>
        </div>
      </div>

      {/* Right pane — inspector */}
      <div className="flex flex-col gap-4 p-5 md:min-h-0 md:overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl ?? undefined}
              bookmarkType={bookmark.type ?? "PAGE"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <EditableText
              value={bookmark.title}
              displayValue={bookmark.title || bookmark.url}
              variant="large"
              className="line-clamp-2 text-base leading-snug"
              onSave={(title) =>
                updateBookmark({
                  id: bookmark.id as Id<"bookmarks">,
                  patch: { title },
                })
              }
              commitOnEnter
              allowEmpty={false}
              ariaLabel="Bookmark title"
            />
            <ExternalLinkTracker url={bookmark.url} surface="bookmark_detail">
              <Typography
                variant="muted"
                className="line-clamp-1 cursor-pointer text-xs break-all hover:underline"
              >
                {bookmark.url}
              </Typography>
            </ExternalLinkTracker>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            data-testid="back-button"
            onClick={closeDetail}
          >
            <X className="text-muted-foreground size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <InlineTooltip title="Open (O)">
            <ExternalLinkTracker url={bookmark.url} surface="bookmark_detail">
              <Button
                variant="default"
                className="flex-1"
                data-testid="external-link-button"
              >
                <ExternalLink className="size-4" />
                <span>Open</span>
              </Button>
            </ExternalLinkTracker>
          </InlineTooltip>
          <StarButton
            bookmarkId={bookmark.id}
            starred={bookmark.starred || false}
          />
          {bookmark.type === "ARTICLE" && (
            <ReadButton
              bookmarkId={bookmark.id}
              read={bookmark.read || false}
            />
          )}
          <CopyLinkButton url={bookmark.url} />
          <ShareButton bookmarkId={bookmark.id} />
          <BookmarkMoreMenu bookmarkId={bookmark.id} readUrl={readUrl} />
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Summary</SectionLabel>
          <EditableText
            value={bookmark.summary}
            displayValue={bookmark.summary || "No summary generated"}
            variant="muted"
            className="text-sm leading-relaxed"
            onSave={(summary) =>
              updateBookmark({
                id: bookmark.id as Id<"bookmarks">,
                patch: { summary },
              })
            }
            commitOnEnter={false}
            allowEmpty
            ariaLabel="Bookmark summary"
          />
        </div>

        {bookmark.type === "PRODUCT" && metadata && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Product</SectionLabel>
            {typeof metadata.brand === "string" && (
              <div className="flex items-center gap-8">
                <Typography className="w-full max-w-24" variant="muted">
                  Brand
                </Typography>
                <Typography variant="small">{metadata.brand}</Typography>
              </div>
            )}
            {typeof metadata.price !== "undefined" && (
              <div className="flex items-center gap-8">
                <Typography variant="muted" className="w-full max-w-24">
                  Price
                </Typography>
                <Typography variant="small">
                  {(metadata.currency as string) || "USD"}{" "}
                  {String(metadata.price)}
                </Typography>
              </div>
            )}
          </div>
        )}

        {bookmark.type === "YOUTUBE" && transcript && (
          <TranscriptViewer transcript={transcript} />
        )}

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Tags</SectionLabel>
          <BookmarkTagSelector
            bookmarkId={bookmark.id}
            placeholder="Search or create tags..."
          />
        </div>

        <BookmarkNote
          note={bookmark.note}
          bookmarkId={bookmark.id}
          variant="plain"
        />

        {embeddedText && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-yellow-500/50 bg-yellow-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Embedded text</SectionLabel>
              <Badge
                variant="outline"
                className="border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
              >
                Admin
              </Badge>
            </div>
            <pre className="text-foreground max-h-72 overflow-auto rounded-md border border-yellow-500/20 bg-background/70 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {embeddedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  if (renderMode === "page") {
    return (
      <main className="bg-muted/40 min-h-screen p-4">
        <section className="bg-background mx-auto h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-lg border">
          {content}
        </section>
      </main>
    );
  }

  return (
    <InterceptDialog fallbackTo="/app" onClose={handleClose}>
      <DialogContent
        disableClose
        className="flex flex-col gap-0 overflow-hidden p-0"
        style={{
          maxWidth: "min(calc(100vw - 32px), 1100px)",
          height: "min(calc(100vh - 32px), 680px)",
        }}
        onEscapeKeyDown={handleClose}
      >
        {content}
      </DialogContent>
    </InterceptDialog>
  );
}

export function BookmarkPage({ bookmarkId }: { bookmarkId: string }) {
  if (!bookmarkId) {
    return null;
  }

  return <BookmarkDetail bookmarkId={bookmarkId} renderMode="page" />;
}
