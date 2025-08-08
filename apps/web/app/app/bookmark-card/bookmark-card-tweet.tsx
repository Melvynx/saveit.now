"use client";

import { memo } from "react";
import { Button } from "@workspace/ui/components/button";
import { Tweet } from "react-tweet";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
} from "./bookmark-card-base";
import { LinkWithQuery } from "./link-with-query";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardTweetProps {
  bookmark: BookmarkCardData;
}

const BookmarkCardTweetComponent = ({ bookmark }: BookmarkCardTweetProps) => {
  const metadata = bookmark.metadata as { tweetId: string };

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="py-0 tweet-container relative"
    >
      <Tweet id={metadata.tweetId} />
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

// Memoize for better virtualization performance
export const BookmarkCardTweet = memo(BookmarkCardTweetComponent);
