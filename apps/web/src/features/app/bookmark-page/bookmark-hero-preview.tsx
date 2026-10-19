"use client";

import { SafeTweet } from "@/features/bookmarks/safe-tweet";
import { ScreenshotUploader } from "@/features/bookmarks/screenshot-uploader";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

export type BookmarkHeroPreviewProps = {
  bookmark: BookmarkDetailDTO;
  className?: string;
};

export const BookmarkHeroPreview = ({
  bookmark,
  className,
}: BookmarkHeroPreviewProps) => {
  const metadata = bookmark.metadata;

  if (bookmark.type === "TWEET") {
    return (
      <div className={cn("[&>*]:mx-0 [&>*]:max-w-none", className)}>
        <SafeTweet
          tweetId={metadata?.tweetId}
          tweet={metadata}
          url={bookmark.url}
          title={bookmark.title}
          summary={bookmark.summary}
        />
      </div>
    );
  }

  if (bookmark.type === "YOUTUBE" && typeof metadata?.youtubeId === "string") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/6",
          className,
        )}
      >
        <iframe
          title={bookmark.title ?? "YouTube video"}
          src={`https://www.youtube.com/embed/${metadata.youtubeId}`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return <HeroImage key={bookmark.id} bookmark={bookmark} className={className} />;
};

function HeroImage({ bookmark, className }: BookmarkHeroPreviewProps) {
  const [preview, setPreview] = useState(bookmark.preview);
  const sources = [preview, bookmark.ogImageUrl].filter(
    (src): src is string => Boolean(src),
  );
  const [failed, setFailed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[failed];
  const isImage = bookmark.type === "IMAGE";

  if (!src) return null;

  return (
    <figure
      className={cn(
        "group relative overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/6",
        !loaded && "aspect-[16/10]",
        className,
      )}
    >
      {!loaded ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
      <img
        src={src}
        alt=""
        className={cn(
          "block h-auto w-full transition-opacity duration-200 ease-(--ease-out-soft)",
          isImage
            ? "max-h-[75vh] object-contain"
            : "max-h-[min(70vh,560px)] object-cover object-top",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setFailed((count) => count + 1);
        }}
      />
      {isImage ? null : (
        <ScreenshotUploader
          bookmarkId={bookmark.id}
          className="top-3 right-3 group-focus-within:opacity-100"
          onUploadSuccess={(next) => {
            setFailed(0);
            setLoaded(false);
            setPreview(next);
          }}
        />
      )}
    </figure>
  );
}
