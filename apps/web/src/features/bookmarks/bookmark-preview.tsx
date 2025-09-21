"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { YouTubeEmbed } from "@next/third-parties/google";
import { Card } from "@workspace/ui/components/card";
import { Image } from "lucide-react";
import { useState } from "react";
import { Tweet } from "react-tweet";

import { BookmarkViewType } from "@/lib/database/get-bookmark";
import useMeasure from "react-use-measure";
import { BookmarkSectionTitle } from "./bookmark-content-view";
import { ScreenshotUploader } from "./screenshot-uploader";

interface BookmarkPreviewProps {
  bookmark: BookmarkViewType;
  isPublic?: boolean;
}

export const BookmarkPreview = ({
  bookmark,
  isPublic = false,
}: BookmarkPreviewProps) => {
  const metadata = bookmark.metadata as Record<string, unknown> | null;
  const [ref, { width }] = useMeasure();
  const [currentPreview, setCurrentPreview] = useState(bookmark.preview);

  const handleUploadSuccess = (newPreviewUrl: string) => {
    setCurrentPreview(newPreviewUrl);
  };

  if (bookmark.type === "TWEET") {
    return (
      <Card className="p-4">
        <BookmarkSectionTitle icon={Image} text="Post" />
        <div className="tweet-container">
          <Tweet id={(bookmark.metadata as { tweetId: string }).tweetId} />
        </div>
      </Card>
    );
  }

  if (bookmark.type === "YOUTUBE" && metadata?.youtubeId) {
    return (
      <Card className="p-4">
        <BookmarkSectionTitle icon={Image} text="Video" />
        <div
          className="aspect-video w-full overflow-hidden rounded-md"
          ref={ref}
        >
          <YouTubeEmbed
            width={width}
            videoid={(bookmark.metadata as { youtubeId: string }).youtubeId}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <BookmarkSectionTitle icon={Image} text="Screenshot" />
      <div className="relative group">
        <ImageWithPlaceholder
          src={currentPreview ?? ""}
          fallbackImage={bookmark.ogImageUrl ?? ""}
          alt="screenshot"
          width={916}
          className="rounded-md"
        />
        {!isPublic && (
          <ScreenshotUploader
            bookmarkId={bookmark.id}
            onUploadSuccess={handleUploadSuccess}
            className="rounded-md"
          />
        )}
      </div>
    </Card>
  );
};
