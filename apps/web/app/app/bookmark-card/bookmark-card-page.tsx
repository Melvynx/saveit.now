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
import { ScreenshotUploadButton } from "@/features/bookmarks/screenshot-upload-button";

interface BookmarkCardPageProps {
  bookmark: Bookmark;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(bookmark.preview);
  
  const domainName = new URL(bookmark.url).hostname;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = bookmark.metadata as any;
  const isVerticalImage = metadata?.width < metadata?.height;

  const handleUploadSuccess = (newPreviewUrl: string) => {
    setCurrentPreview(newPreviewUrl);
    setIsUploadOpen(false);
  };

  if (isUploadOpen) {
    return (
      <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-page">
        <div className="p-4">
          <ScreenshotUploader
            bookmarkId={bookmark.id}
            currentPreviewUrl={currentPreview ?? undefined}
            onUploadSuccess={handleUploadSuccess}
            onCancel={() => setIsUploadOpen(false)}
          />
        </div>
      </BookmarkCardContainer>
    );
  }

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
          <ScreenshotUploadButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsUploadOpen(true);
            }}
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
