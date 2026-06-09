import { BookmarkContentView } from "@/features/bookmarks/bookmark-content-view";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";

function hasMarkdownContent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const m = metadata as Record<string, unknown>;
  return typeof m.markdown === "string" && m.markdown.length > 0;
}
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { InterceptDialog } from "@/components/intercept-dialog";
import { Loader } from "@workspace/ui/components/loader";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { BookOpen, ExternalLink } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { ExternalLinkTracker } from "../external-link-tracker";
import {
  BackButton,
  CopyLinkButton,
  ReBookmarkButton,
  ShareButton,
} from "./bookmark-actions-button";
import { DeleteButton } from "./delete-button";
import { ReadButton } from "./read-button";
import { StarButton } from "./star-button";
import { useBookmark } from "./use-bookmark";

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
  const query = useBookmark(bookmarkId);
  const bookmark = query.data?.bookmark;

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
      <Dialog open={true} key="loading">
        <DialogContent>
          <DialogTitle className="sr-only">Loading bookmark</DialogTitle>
          <Loader />
        </DialogContent>
      </Dialog>
    );
  }

  const content = (
    <>
      {renderMode === "dialog" ? (
        <DialogTitle className="sr-only">
          {bookmark.title || "Bookmark details"}
        </DialogTitle>
      ) : (
        <h1 className="sr-only">{bookmark.title || "Bookmark details"}</h1>
      )}
      <header className="flex items-center gap-2 px-6 pt-6">
        <div className="flex-1"></div>
        <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            data-testid="external-link-button"
          >
            <ExternalLink className="text-muted-foreground size-4" />
          </Button>
        </ExternalLinkTracker>
        <ButtonGroup>
          <CopyLinkButton url={bookmark.url} />
          <ShareButton bookmarkId={bookmark.id} />

          <StarButton
            bookmarkId={bookmark.id}
            starred={bookmark.starred || false}
          />
          {bookmark.type === "ARTICLE" && (
            <>
              <ReadButton bookmarkId={bookmark.id} read={bookmark.read || false} />
              {hasMarkdownContent(bookmark.metadata) && (
                <InlineTooltip title="Read Article">
                  <Button size="icon" variant="outline" className="size-8" asChild>
                    <a href={`/p/${bookmark.id}/read`} target="_blank" rel="noreferrer">
                      <BookOpen className="text-muted-foreground size-4" />
                    </a>
                  </Button>
                </InlineTooltip>
              )}
            </>
          )}
          <ReBookmarkButton bookmarkId={bookmark.id} />
          <BackButton />
        </ButtonGroup>
      </header>
      <div className="px-6 py-4">
        <BookmarkContentView bookmark={bookmark as unknown as BookmarkDetailDTO} />
      </div>
      <footer className="flex items-center gap-2 border-t-2 p-6">
        <div className="flex-1"></div>
        <DeleteButton bookmarkId={bookmark.id} />
        <InlineTooltip title="Open (O)">
          <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
            <Button variant="default">
              <ExternalLink className="size-4" />
              <span>Open</span>
            </Button>
          </ExternalLinkTracker>
        </InlineTooltip>
      </footer>
    </>
  );

  if (renderMode === "page") {
    return (
      <main className="min-h-screen bg-muted/40 p-4">
        <section className="mx-auto flex max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border bg-background">
          {content}
        </section>
      </main>
    );
  }

  return (
    <InterceptDialog fallbackTo="/app">
      <DialogContent
        disableClose
        className="flex flex-col gap-0 overflow-auto p-0"
        style={{
          maxWidth: "min(calc(100vw - 32px), 1000px)",
          maxHeight: "calc(100vh - 32px)",
        }}
        onEscapeKeyDown={onClose}
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
