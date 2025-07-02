/* eslint-disable @next/next/no-img-element */
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { Typography } from "@workspace/ui/components/typography";
import { Image, LucideIcon, Sparkle, TagIcon } from "lucide-react";
import { Tweet } from "react-tweet";

import { BookmarkViewType } from "@/lib/database/get-bookmark";
import { BookmarkFavicon } from "app/app/bookmark-favicon";
import { BookmarkNote } from "app/app/bookmark-page/bookmark-note";
import { ExternalLinkTracker } from "app/app/external-link-tracker";

export const BookmarkContentView = ({
  bookmark,
  isPublic = false,
}: {
  bookmark: BookmarkViewType;
  isPublic?: boolean;
}) => {
  return (
    <main className="flex flex-col gap-4">
      <Card className="p-0 h-24 overflow-hidden flex flex-row items-center">
        <div className="flex items-start gap-2 p-4">
          <div className="flex size-8 items-center justify-center rounded border shrink-0">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl ?? undefined}
              bookmarkType={bookmark.type ?? "BLOG"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ExternalLinkTracker bookmarkId={bookmark.id} url={bookmark.url}>
              <Typography
                variant="large"
                className="line-clamp-1 cursor-pointer hover:underline"
              >
                {bookmark.url}
              </Typography>
            </ExternalLinkTracker>
            <Typography variant="muted">{bookmark.title}</Typography>
          </div>
        </div>
        {bookmark.ogImageUrl && (
          <div className="h-full ml-auto">
            <img
              src={bookmark.ogImageUrl}
              alt="og-image"
              className="rounded-md h-full max-h-24 w-auto"
              width={200}
              height={96}
            />
          </div>
        )}
      </Card>
      <Card className="p-4">
        <BookmarkSectionTitle icon={Sparkle} text="Summary" />
        <div className="flex flex-col gap-2">
          <Typography variant="muted">
            {bookmark.summary || "No summary generated"}
          </Typography>
        </div>
      </Card>
      <Card className="p-4">
        {bookmark.type === "TWEET" ? (
          <>
            <BookmarkSectionTitle icon={Image} text="Post" />
            <div className="tweet-container">
              <Tweet id={(bookmark.metadata as { tweetId: string }).tweetId} />
            </div>
          </>
        ) : (
          <>
            <BookmarkSectionTitle icon={Image} text="Screenshot" />
            <ImageWithPlaceholder
              src={bookmark.preview ?? ""}
              fallbackImage={bookmark.ogImageUrl ?? ""}
              alt="screenshot"
              className="rounded-md"
            />
          </>
        )}
      </Card>
      <Card className="p-4">
        <BookmarkSectionTitle icon={TagIcon} text="Tags" />
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
      {!isPublic && (
        <BookmarkNote note={bookmark.note} bookmarkId={bookmark.id} />
      )}
    </main>
  );
};

export const BookmarkSectionTitle = (props: {
  icon: LucideIcon;
  text: string;
}) => {
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
