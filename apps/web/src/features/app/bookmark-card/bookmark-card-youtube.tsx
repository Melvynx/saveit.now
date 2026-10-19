"use client";

import { Play } from "lucide-react";
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

interface BookmarkCardYouTubeProps {
  bookmark: BookmarkCardData;
}

const getYoutubeId = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return null;
  const id = Reflect.get(metadata, "youtubeId");
  return typeof id === "string" && /^[\w-]{6,20}$/.test(id) ? id : null;
};

export const BookmarkCardYouTube = ({ bookmark }: BookmarkCardYouTubeProps) => {
  const youtubeId = getYoutubeId(bookmark.metadata);
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || "YouTube video";
  const thumbnail = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
    : bookmark.ogImageUrl;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-youtube">
      <CardLink bookmarkId={bookmark.id} label={title}>
        <CardMedia
          src={thumbnail}
          fallbackSrc={bookmark.ogImageUrl ?? bookmark.preview}
          alt=""
          minRatio={16 / 9}
          maxRatio={16 / 9}
          imgClassName="object-center"
          fallback={
            <CardFallbackTile
              title={title}
              faviconUrl={bookmark.faviconUrl}
              type={bookmark.type}
            />
          }
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm ring-1 ring-foreground/8 backdrop-blur-md transition-transform duration-200 ease-(--ease-out-soft) group-hover/card:scale-105">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
          </span>
        </CardMedia>
        <CardBody
          title={title}
          domain={domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
          unread={isUnread(bookmark)}
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
