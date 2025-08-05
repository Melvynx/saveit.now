"use client";

import { YouTubeEmbed } from "@next/third-parties/google";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";
import { BookmarkCardTags } from "./bookmark-card-tags";

interface BookmarkCardYouTubeProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardYouTube = ({ bookmark }: BookmarkCardYouTubeProps) => {
  const metadata = bookmark.metadata as {
    youtubeId: string;
    transcript?: string;
    transcriptSource?: string;
    transcriptAvailable?: boolean;
  };
  const domainName = new URL(bookmark.url).hostname;

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader height={HEADER_HEIGHT}>
        {(bounds) => (
          <>
            <YouTubeEmbed videoid={metadata.youtubeId} width={bounds.width} />
            <BookmarkCardActions
              url={bookmark.url}
              bookmarkId={bookmark.id}
              starred={bookmark.starred || false}
              read={bookmark.read || false}
              bookmarkType={bookmark.type}
            />
          </>
        )}
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
            <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
            {bookmark.tags && bookmark.tags.length > 0 && (
              <BookmarkCardTags
                bookmarkId={bookmark.id}
                tags={bookmark.tags.map((t) => t.tag)}
                className="mt-2"
              />
            )}
          </div>
        </div>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
