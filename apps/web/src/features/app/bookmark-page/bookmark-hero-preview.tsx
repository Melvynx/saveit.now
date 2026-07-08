"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { SafeTweet } from "@/features/bookmarks/safe-tweet";
import { ScreenshotUploader } from "@/features/bookmarks/screenshot-uploader";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { useState } from "react";

export type BookmarkHeroPreviewProps = {
  bookmark: BookmarkDetailDTO;
};

export const BookmarkHeroPreview = ({ bookmark }: BookmarkHeroPreviewProps) => {
  const metadata = bookmark.metadata as Record<string, unknown> | null;
  const [currentPreview, setCurrentPreview] = useState(bookmark.preview);

  if (bookmark.type === "TWEET") {
    return (
      <div className="flex h-full items-start justify-center overflow-y-auto p-6">
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

  if (bookmark.type === "YOUTUBE" && metadata?.youtubeId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <iframe
          title={bookmark.title ?? "YouTube video"}
          src={`https://www.youtube.com/embed/${metadata.youtubeId as string}`}
          className="aspect-video w-full rounded-md"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full">
      <ImageWithPlaceholder
        src={currentPreview ?? ""}
        fallbackImage={bookmark.ogImageUrl ?? ""}
        alt="screenshot"
        width={1200}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <ScreenshotUploader
        bookmarkId={bookmark.id}
        onUploadSuccess={setCurrentPreview}
      />
    </div>
  );
};
