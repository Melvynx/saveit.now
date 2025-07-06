"use client";

import { YouTubeEmbed } from "@next/third-parties/google";
import { Bookmark } from "@workspace/database";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";

interface BookmarkCardYouTubeProps {
  bookmark: Bookmark;
}

export const BookmarkCardYouTube = ({ bookmark }: BookmarkCardYouTubeProps) => {
  const metadata = bookmark.metadata as { youtubeId: string };
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
              isBlog={bookmark.type === "BLOG"}
            />
          </>
        )}
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
