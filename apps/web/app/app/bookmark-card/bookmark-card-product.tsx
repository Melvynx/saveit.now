"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { formatPrice } from "@workspace/ui/lib/format";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardProductProps {
  bookmark: BookmarkCardData;
}

interface ProductMetadata {
  price?: number;
  currency?: string;
  brand?: string;
  availability?: string;
}

export const BookmarkCardProduct = ({ bookmark }: BookmarkCardProductProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const metadata = bookmark.metadata as ProductMetadata;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-product">
      <BookmarkCardHeader>
        <LinkWithQuery
          to={`/app/b/${bookmark.id}`}
          className="h-full w-full flex-1 relative"
        >
          <ImageWithPlaceholder
            src={bookmark.preview ?? ""}
            fallbackImage={bookmark.ogImageUrl ?? null}
            className="h-full w-full object-cover object-center mx-auto"
            alt={bookmark.title ?? "Product"}
          />

          {/* Price overlay - positioned like YouTube duration */}
          {metadata?.price && metadata.price > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-sm font-medium">
              {formatPrice(metadata.price, metadata.currency)}
            </div>
          )}

          {/* Brand badge - positioned in top left */}
          {metadata?.brand && (
            <div className="absolute top-2 left-2 bg-white/90 text-black px-2 py-1 rounded text-xs font-medium max-w-24 truncate">
              {metadata.brand}
            </div>
          )}
        </LinkWithQuery>

        <BookmarkCardActions
          url={bookmark.url}
          bookmarkId={bookmark.id}
          starred={bookmark.starred || false}
          read={bookmark.read || false}
          bookmarkType={bookmark.type}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle className="line-clamp-1">
          {bookmark.title}
        </BookmarkCardTitle>
        <BookmarkCardDescription>{domainName}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
