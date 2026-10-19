"use client";

import { SafeTweet } from "@/features/bookmarks/safe-tweet";
import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import { CardLink } from "./bookmark-card-parts";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardTweetProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardTweet = ({ bookmark }: BookmarkCardTweetProps) => {
  const metadata = bookmark.metadata as { tweetId?: unknown } | null;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-tweet">
      <CardLink bookmarkId={bookmark.id} label={bookmark.title || "Tweet"}>
        <div
          className={
            "pointer-events-none @container overflow-hidden @max-3xs:[&_article]:px-3 @max-3xs:[&_article_p]:text-[13px] @max-3xs:[&_footer>span]:hidden @max-3xs:[&_header_p+p]:hidden [&_article]:rounded-none [&_article]:border-0 [&_article]:bg-transparent [&_article]:px-3.5 [&_article]:py-3.5 [&_article]:shadow-none [&_article_p]:text-[14px] [&_article_p]:leading-[1.5]"
          }
        >
          <SafeTweet
            tweetId={metadata?.tweetId}
            tweet={metadata}
            url={bookmark.url}
            title={bookmark.title}
            summary={bookmark.summary}
            compact
            showOpenButton={false}
          />
        </div>
      </CardLink>
      <BookmarkCardActions
        url={bookmark.url}
        bookmarkId={bookmark.id}
        starred={bookmark.starred || false}
        read={bookmark.read || false}
        bookmarkType={bookmark.type}
        title={bookmark.title}
      />
    </BookmarkCardContainer>
  );
};
