import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { Typography } from "@workspace/ui/components/typography";
import { Loader } from "@workspace/ui/componentscomponents/loader";
import {
  ExternalLink,
  Image,
  LucideIcon,
  Sparkle,
  TagIcon,
} from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { z } from "zod";
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
        className=" p-0 flex flex-col gap-0"
        style={{ maxWidth: "min(calc(100vw - 32px), 1000px)" }}
      >
        <header className="px-6 pt-6 flex items-center gap-2">
          <div className="flex-1"></div>
          <Button size="icon" variant="outline" className="size-8" asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="size-4 text-muted-foreground" />
            </Link>
          </Button>
          <CopyLinkButton url={bookmark.url} />

          <ReBookmarkButton bookmarkId={bookmark.id} />
          <BackButton />
        </header>
        <main className="p-6 flex flex-col gap-4 lg:gap-6">
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <div className="size-8 border rounded items-center justify-center flex">
                <img
                  src={bookmark.faviconUrl ?? ""}
                  alt="favicon"
                  className="size-5"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="large">{domainName}</Typography>
                <Typography variant="muted">{bookmark.title}</Typography>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Sparkle} text="Summary" />
            <div className="flex flex-col gap-2">
              <Typography variant="muted">{bookmark.summary}</Typography>
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle icon={Image} text="Screenshot" />
            <img
              src={bookmark.preview ?? ""}
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
        <footer className="p-6 flex items-center gap-2 border-t-2">
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
