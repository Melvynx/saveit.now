import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { Loader } from "@workspace/ui/components/loader";
import { Typography } from "@workspace/ui/components/typography";
import {
  ExternalLink,
  Image,
  LucideIcon,
  Sparkle,
  TagIcon,
} from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { BookmarkFavicon } from "../bookmark-favicon";
import {
  BackButton,
  CopyLinkButton,
  ReBookmarkButton,
} from "./bookmark-actions-button";
import { DeleteButton } from "./delete-button";
import { useBookmark } from "./use-bookmark";

export function BookmarkPage() {
  const [bookmarkId, setBookmarkId] = useQueryState("b");

  const query = useBookmark(bookmarkId);

  const bookmark = query.data?.bookmark;

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

  const domainName = new URL(bookmark.url).hostname;

  return (
    <Dialog open={true} onOpenChange={() => setBookmarkId(null)} key="view">
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
          <Button size="icon" variant="outline" className="size-8" asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="text-muted-foreground size-4" />
            </Link>
          </Button>
          <CopyLinkButton url={bookmark.url} />

          <ReBookmarkButton bookmarkId={bookmark.id} />
          <BackButton />
        </header>
        <main className="flex flex-col gap-4 p-6 lg:gap-6">
          <Card className="p-0 h-24 overflow-hidden flex flex-row items-center">
            <div className="flex items-start gap-2 p-4">
              <div className="flex size-8 items-center justify-center rounded border">
                <BookmarkFavicon
                  faviconUrl={bookmark.faviconUrl ?? undefined}
                  bookmarkType={bookmark.type}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="large">{domainName}</Typography>
                <Typography variant="muted">{bookmark.title}</Typography>
              </div>
            </div>
            {bookmark.ogImageUrl && (
              <div className="h-full ml-auto">
                <img
                  src={bookmark.ogImageUrl}
                  alt="og-image"
                  className="rounded-md h-full max-h-24 w-auto"
                />
              </div>
            )}
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Sparkle} text="Summary" />
            <div className="flex flex-col gap-2">
              <Typography variant="muted">{bookmark.summary}</Typography>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Image} text="Screenshot" />
            <ImageWithPlaceholder
              src={bookmark.preview ?? ""}
              fallbackImage={bookmark.ogImageUrl ?? ""}
              alt="screenshot"
              className="rounded-md"
            />
          </Card>
          <Card className="p-4">
            <SectionTitle icon={TagIcon} text="Tags" />
            <div className="flex flex-col gap-2">
              <Typography variant="muted">AI Generated</Typography>
              <div className="flex flex-wrap gap-2">
                {bookmark.tags
                  .filter((tag) => tag.tag.type === "IA")
                  .map((tag) => (
                    <Tag key={tag.tag.id} name={tag.tag.name} />
                  ))}
              </div>
            </div>
          </Card>
        </main>
        <footer className="flex items-center gap-2 border-t-2 p-6">
          <div className="flex-1"></div>

          <DeleteButton bookmarkId={bookmark.id} />
          <Button variant="default" asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="size-4" />
              <span>Open</span>
            </Link>
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

const SectionTitle = (props: { icon: LucideIcon; text: string }) => {
  return (
    <div className="flex items-center gap-2">
      <props.icon className="text-primary size-4" />
      <Typography variant="muted">{props.text}</Typography>
    </div>
  );
};

const Tag = (props: { name: string }) => {
  return <Badge variant="outline">{props.name}</Badge>;
};
