import { BookmarkContentView } from "@/features/bookmarks/bookmark-content-view";
import { hasMarkdownContent } from "@/lib/bookmark-content";
import { BookmarkViewType } from "@/lib/database/get-bookmark";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { Loader } from "@workspace/ui/components/loader";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useHotkeys } from "react-hotkeys-hook";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useNavigateWithQuery } from "../bookmark-card/link-with-query";
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

export function BookmarkPage() {
  const params = useParams();
  const navigate = useNavigateWithQuery();
  const bookmarkId = params.id as string;

  const query = useBookmark(bookmarkId);

  const bookmark = query.data?.bookmark;

  useHotkeys("c", () => {
    // copy
    if (!bookmark) return;
    window.navigator.clipboard.writeText(bookmark.url);
    toast.success("Copied to clipboard");
  });

  useHotkeys("o", () => {
    if (!bookmark) return;
    window.open(bookmark.url, "_blank");
  });

  if (!bookmarkId) {
    return null;
  }

  if (!bookmark) {
    return (
      <Dialog open={true} key="loading">
        <DialogContent>
          <Loader />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => navigate("/app")} key="view">
      <DialogContent
        disableClose
        className="flex flex-col gap-0 overflow-auto p-0"
        style={{
          maxWidth: "min(calc(100vw - 32px), 1000px)",
          maxHeight: "calc(100vh - 32px)",
        }}
      >
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
                <ReadButton
                  bookmarkId={bookmark.id}
                  read={bookmark.read || false}
                />
                {hasMarkdownContent(bookmark.metadata) && (
                  <InlineTooltip title="Read Article">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      asChild
                    >
                      <Link href={`/p/${bookmark.id}/read`} target="_blank">
                        <BookOpen className="text-muted-foreground size-4" />
                      </Link>
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
          <BookmarkContentView bookmark={bookmark as BookmarkViewType} />
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
      </DialogContent>
    </Dialog>
  );
}
