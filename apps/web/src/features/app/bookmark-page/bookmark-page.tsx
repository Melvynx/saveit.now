import { InterceptDialog } from "@/components/intercept-dialog";
import { BookmarkTagSelector } from "@/features/app/bookmark-card/bookmark-tag-selector";
import { BookmarkFavicon } from "@/features/app/bookmark-favicon";
import { TranscriptViewer } from "@/features/bookmarks/transcript-viewer";
import { useSession } from "@/lib/auth-client";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Loader } from "@workspace/ui/components/loader";
import { Separator } from "@workspace/ui/components/separator";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { Typography } from "@workspace/ui/components/typography";
import { ExternalLink, X } from "lucide-react";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { ExternalLinkTracker } from "../external-link-tracker";
import { CopyLinkButton, ShareButton } from "./bookmark-actions-button";
import { BookmarkHeroPreview } from "./bookmark-hero-preview";
import { BookmarkMoreMenu } from "./bookmark-more-menu";
import { BookmarkNote } from "./bookmark-note";
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
    if (renderMode === "page") {
      return (
        <main className="flex min-h-screen items-center justify-center">
          <Loader />
        </main>
      );
    }

    return (
      <Dialog
        open={true}
        key="loading"
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DialogContent onEscapeKeyDown={handleClose}>
          <DialogTitle className="sr-only">Loading bookmark</DialogTitle>
          <Loader />
        </DialogContent>
      </Dialog>
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
            <Typography
              variant="large"
              className="line-clamp-2 text-base leading-snug"
            >
              {bookmark.title || bookmark.url}
            </Typography>
            <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
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
            <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
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
          <Typography variant="muted" className="text-sm leading-relaxed">
            {bookmark.summary || "No summary generated"}
          </Typography>
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
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Embedded text</SectionLabel>
            <pre className="bg-muted text-foreground max-h-72 overflow-auto rounded-md p-3 text-sm leading-relaxed whitespace-pre-wrap">
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
