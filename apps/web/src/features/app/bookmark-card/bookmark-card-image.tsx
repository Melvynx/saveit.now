"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { cn } from "@workspace/ui/lib/utils";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardImageProps {
  bookmark: BookmarkCardData;
}

const CARD_ASPECT_RATIO = 384 / 290;

const shouldCoverImage = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") return true;

  const width = Reflect.get(metadata, "width");
  const height = Reflect.get(metadata, "height");

  if (typeof width !== "number" || typeof height !== "number" || height <= 0) {
    return true;
  }

  return width / height >= CARD_ASPECT_RATIO;
};

export const BookmarkCardImage = ({ bookmark }: BookmarkCardImageProps) => {
  const domainName = new URL(bookmark.url).hostname.replace("www.", "");
  const imageUrl = bookmark.preview ?? bookmark.url;
  const coverImage = shouldCoverImage(bookmark.metadata);

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="relative gap-0 break-inside-avoid-column bg-muted/40"
      testId="bookmark-card-image"
    >
      <LinkWithQuery
        to={`/app/b/${bookmark.id}`}
        className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      >
        <ImageWithPlaceholder
          src={imageUrl}
          fallbackImage={bookmark.url}
          alt={bookmark.title ?? "Image"}
          className={cn(
            "h-full w-full object-center",
            coverImage ? "object-cover" : "object-contain",
          )}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pt-10 pb-3 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100 motion-reduce:transition-none">
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm leading-tight font-medium text-white drop-shadow-sm">
              {bookmark.title || "Image"}
            </p>
            <p className="mt-1 hidden line-clamp-1 text-xs leading-none text-white/70 md:block">
              {domainName}
            </p>
          </div>
        </div>
      </LinkWithQuery>

      <BookmarkCardActions
        url={bookmark.url}
        bookmarkId={bookmark.id}
        starred={bookmark.starred || false}
        read={bookmark.read || false}
        bookmarkType={bookmark.type}
        className="z-20"
      />
    </BookmarkCardContainer>
  );
};
