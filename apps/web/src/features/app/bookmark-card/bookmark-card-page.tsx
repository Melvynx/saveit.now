"use client";

import { useCallback, useState } from "react";
import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import {
  CardBody,
  CardFallbackTile,
  CardLink,
  CardMedia,
  getDomain,
  isUnread,
} from "./bookmark-card-parts";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardPageProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || domain;
  const summary = bookmark.summary || bookmark.ogDescription;
  const unread = isUnread(bookmark);
  const fallback = (
    <CardFallbackTile
      title={title}
      faviconUrl={bookmark.faviconUrl}
      type={bookmark.type}
    />
  );
  const [mediaFailed, setMediaFailed] = useState(false);
  const hasImage =
    Boolean(bookmark.preview || bookmark.ogImageUrl) && !mediaFailed;
  const onUnavailable = useCallback(() => setMediaFailed(true), []);

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-page">
      <CardLink bookmarkId={bookmark.id} label={title}>
        {hasImage ? (
          <CardMedia
            src={bookmark.ogImageUrl}
            fallbackSrc={bookmark.preview}
            alt=""
            fallback={fallback}
            onUnavailable={onUnavailable}
          />
        ) : (
          fallback
        )}
        <CardBody
          title={hasImage ? title : null}
          summary={summary}
          domain={domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
          unread={unread}
        />
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
