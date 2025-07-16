"use client";

import { YouTubeEmbed } from "@next/third-parties/google";
import { Bookmark } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { BookOpenText } from "lucide-react";

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
  const metadata = bookmark.metadata as { 
    youtubeId: string; 
    transcript?: string;
    transcriptSource?: string;
    transcriptAvailable?: boolean;
  };
  const domainName = new URL(bookmark.url).hostname;
  const hasTranscript = metadata?.transcript || metadata?.transcriptAvailable;

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
          </div>
          {hasTranscript && (
            <Badge variant="secondary" className="ml-2 flex items-center gap-1">
              <BookOpenText className="size-3" />
              Transcript
            </Badge>
          )}
        </div>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
