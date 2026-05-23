"use client";

import { SafeTweet } from "@/features/bookmarks/safe-tweet";
import { Button } from "@workspace/ui/components/button";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
} from "./bookmark-card-base";
import { LinkWithQuery } from "./link-with-query";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardTweetProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardTweet = ({ bookmark }: BookmarkCardTweetProps) => {
  const metadata = bookmark.metadata as { tweetId?: unknown } | null;

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="py-0 tweet-container relative overflow-hidden"
    >
      <div className="overflow-hidden pointer-events-none">
        <SafeTweet
          tweetId={metadata?.tweetId}
          url={bookmark.url}
          title={bookmark.title}
          summary={bookmark.summary}
        />
      </div>
      <BookmarkCardActions
        url={bookmark.url}
        bookmarkId={bookmark.id}
        starred={bookmark.starred || false}
        read={bookmark.read || false}
        bookmarkType={bookmark.type}
        className="z-50"
      >
        <Button asChild variant="secondary" className="hover:bg-accent">
          <LinkWithQuery to={`/app/b/${bookmark.id}`}>Open</LinkWithQuery>
        </Button>
      </BookmarkCardActions>
    </BookmarkCardContainer>
  );
};
