"use client";

import { formatPrice } from "@workspace/ui/lib/format";
import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import {
  CardBody,
  CardFallbackTile,
  CardLink,
  CardMedia,
  getDomain,
} from "./bookmark-card-parts";
import { BookmarkCardData } from "./bookmark.types";

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
  const domain = getDomain(bookmark.url);
  const metadata = (bookmark.metadata ?? {}) as ProductMetadata;
  const title = bookmark.title || domain;
  const price =
    typeof metadata.price === "number" && metadata.price > 0
      ? formatPrice(metadata.price, metadata.currency)
      : null;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-product">
      <CardLink bookmarkId={bookmark.id} label={title}>
        <CardMedia
          src={bookmark.ogImageUrl}
          fallbackSrc={bookmark.preview}
          alt=""
          minRatio={1}
          maxRatio={4 / 3}
          className="bg-card"
          imgClassName="object-contain object-center p-3"
          fallback={
            <CardFallbackTile
              title={title}
              faviconUrl={bookmark.faviconUrl}
              type={bookmark.type}
            />
          }
        >
          {price ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex h-6 items-center rounded-full bg-background/90 px-2.5 text-[12px] font-semibold text-foreground tabular-nums shadow-xs ring-1 ring-foreground/8 backdrop-blur-md">
              {price}
            </span>
          ) : null}
        </CardMedia>
        <CardBody
          title={title}
          domain={metadata.brand ? `${metadata.brand} · ${domain}` : domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
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
