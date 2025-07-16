"use client";

import { Bookmark } from "@workspace/database";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { useState } from "react";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { LinkWithQuery } from "./link-with-query";
import { ScreenshotUploader } from "@/features/bookmarks/screenshot-uploader";

interface BookmarkCardPageProps {
  bookmark: Bookmark;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const [currentPreview, setCurrentPreview] = useState(bookmark.preview);
  
  const domainName = new URL(bookmark.url).hostname;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = bookmark.metadata as any;
  const isVerticalImage = metadata?.width < metadata?.height;

  const handleUploadSuccess = (newPreviewUrl: string) => {
    setCurrentPreview(newPreviewUrl);
  };

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-page">
      <BookmarkCardHeader>
        <div className="relative h-full w-full flex-1 group">
          <LinkWithQuery
            to={`/app/b/${bookmark.id}`}
            className="h-full w-full flex-1"
          >
            <ImageWithPlaceholder
              src={currentPreview ?? ""}
              fallbackImage={bookmark.ogImageUrl ?? null}
              className="h-full w-full object-cover object-center mx-auto"
              alt={bookmark.title ?? "Preview"}
              style={
                bookmark.type === "IMAGE"
                  ? {
                      objectFit: isVerticalImage ? "contain" : "cover",
                    }
                  : {
                      objectFit: "cover",
                    }
              }
            />
          </LinkWithQuery>
          <ScreenshotUploader
            bookmarkId={bookmark.id}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
        <BookmarkCardActions
          url={bookmark.url}
          bookmarkId={bookmark.id}
          starred={bookmark.starred || false}
          read={bookmark.read || false}
          bookmarkType={bookmark.type}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
