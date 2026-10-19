"use client";

import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import {
  CardFallbackTile,
  CardLink,
  CardMedia,
  getDomain,
  getMetadataRatio,
} from "./bookmark-card-parts";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardImageProps {
  bookmark: BookmarkCardData;
}

/** Image only, caption revealed on hover / focus (always on touch). */
export const BookmarkCardImage = ({ bookmark }: BookmarkCardImageProps) => {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || "Image";

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="bg-muted"
      testId="bookmark-card-image"
    >
      <CardLink bookmarkId={bookmark.id} label={title}>
        <CardMedia
          src={bookmark.preview ?? bookmark.url}
          fallbackSrc={bookmark.url}
          alt={bookmark.imageDescription ?? title}
          minRatio={3 / 4}
          maxRatio={2}
          initialRatio={getMetadataRatio(bookmark.metadata)}
          fallback={
            <CardFallbackTile
              title={title}
              faviconUrl={bookmark.faviconUrl}
              type={bookmark.type}
            />
          }
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-linear-to-t from-black/65 via-black/20 to-transparent px-3 pt-12 pb-2.5 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 group-focus-within/card:opacity-100 group-data-focused/item:opacity-100 motion-reduce:transition-none [@media(pointer:coarse)]:opacity-100">
            <div className="min-w-0">
              <p className="line-clamp-1 text-[13px] leading-tight font-medium text-white">
                {title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[12px] text-white/70">
                {domain}
              </p>
            </div>
          </div>
        </CardMedia>
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
