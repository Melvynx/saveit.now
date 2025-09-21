"use client";

/* eslint-disable @next/next/no-img-element */
import { Card, CardContent } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { LucideIcon, ShoppingBag, Sparkle, TagIcon } from "lucide-react";

import { BookmarkViewType } from "@/lib/database/get-bookmark";
import { BookmarkTagSelector } from "app/app/bookmark-card/bookmark-tag-selector";
import { BookmarkFavicon } from "app/app/bookmark-favicon";
import { BookmarkNote } from "app/app/bookmark-page/bookmark-note";
import { ExternalLinkTracker } from "app/app/external-link-tracker";
import { BookmarkPreview } from "./bookmark-preview";
import { TranscriptViewer } from "./transcript-viewer";

export const BookmarkContentView = ({
  bookmark,
  isPublic = false,
}: {
  bookmark: BookmarkViewType;
  isPublic?: boolean;
}) => {
  // Extract transcript data from metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = bookmark.metadata as Record<string, any> | null;
  const transcript = metadata?.transcript as string | undefined;
  return (
    <main className="flex flex-col gap-4">
      <Card className="p-0 min-h-24 overflow-hidden flex flex-row items-center">
        <div className="flex items-start gap-2 p-4 flex-1">
          <div className="flex size-8 items-center justify-center rounded border shrink-0">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl ?? undefined}
              bookmarkType={bookmark.type ?? "PAGE"}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1  ">
            {["PRODUCT", "YOUTUBE", "IMAGE"].includes(
              bookmark.type ?? "PAGE",
            ) ? (
              <>
                <Typography variant="large" className="line-clamp-1">
                  {bookmark.title}
                </Typography>

                {bookmark.url.startsWith("http") && (
                  <ExternalLinkTracker
                    bookmarkId={bookmark.id}
                    url={bookmark.url}
                  >
                    <Typography
                      variant="muted"
                      className="line-clamp-1 cursor-pointer hover:underline"
                    >
                      {bookmark.url}
                    </Typography>
                  </ExternalLinkTracker>
                )}
              </>
            ) : (
              <>
                <ExternalLinkTracker
                  bookmarkId={bookmark.id}
                  url={bookmark.url}
                >
                  <Typography
                    variant="large"
                    className="line-clamp-1 cursor-pointer hover:underline"
                  >
                    {bookmark.url}
                  </Typography>
                </ExternalLinkTracker>
                <Typography variant="muted">{bookmark.title}</Typography>
              </>
            )}
          </div>
        </div>
        {bookmark.ogImageUrl && (
          <div className="flex-shrink-0 ml-auto h-24">
            <img
              src={bookmark.ogImageUrl}
              alt="og-image"
              className="rounded-md h-full w-full object-cover"
              width={128}
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

      {/* YouTube Transcript Section */}
      {bookmark.type === "YOUTUBE" && transcript && (
        <TranscriptViewer transcript={transcript} />
      )}

      {bookmark.type === "PRODUCT" && metadata && (
        <Card className="p-4">
          <BookmarkSectionTitle icon={ShoppingBag} text="Product" />
          <CardContent>
            {metadata.brand && (
              <div className="flex items-center gap-8">
                <Typography className="max-w-24 w-full" variant="muted">
                  Brand
                </Typography>
                <Typography variant="small">{metadata.brand}</Typography>
              </div>
            )}
            {metadata.price && (
              <div className="flex items-center gap-8">
                <Typography variant="muted" className="w-full max-w-24">
                  Price
                </Typography>
                <Typography variant="small">
                  {metadata.currency || "USD"} {metadata.price}
                </Typography>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <BookmarkPreview bookmark={bookmark} isPublic={isPublic} />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <BookmarkSectionTitle icon={TagIcon} text="Tags" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Typography variant="muted">Tags</Typography>
            {!isPublic ? (
              <BookmarkTagSelector
                bookmarkId={bookmark.id}
                placeholder="Search or create tags..."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {bookmark.tags.length === 0 ? (
                  <Typography variant="muted">No tags</Typography>
                ) : (
                  bookmark.tags.map((tag) => (
                    <span
                      key={tag.tag.id}
                      className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tag.tag.name}
                    </span>
                  ))
                )}
              </div>
            )}
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
