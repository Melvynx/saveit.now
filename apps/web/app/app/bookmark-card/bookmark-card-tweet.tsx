"use client";

import { Bookmark } from "@workspace/database";

import { Button } from "@workspace/ui/components/button";
import { Tweet } from "react-tweet";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
} from "./bookmark-card-base";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardTweetProps {
  bookmark: Bookmark;
}

export const BookmarkCardTweet = ({ bookmark }: BookmarkCardTweetProps) => {
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
        isBlog={bookmark.type === "BLOG"}
        className="z-50"
      >
        <Button asChild variant="secondary" className="hover:bg-accent">
          <LinkWithQuery to={`/app/b/${bookmark.id}`}>Open</LinkWithQuery>
        </Button>
      </BookmarkCardActions>
    </BookmarkCardContainer>
  );
};
