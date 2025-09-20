"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";

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

interface BookmarkCardPageProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const domainName = new URL(bookmark.url).hostname;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = bookmark.metadata as any;
  const isVerticalImage = metadata?.width < metadata?.height;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-page">
      <BookmarkCardHeader>
        <LinkWithQuery
          to={`/app/b/${bookmark.id}`}
          className="h-full w-full flex-1"
        >
          <ImageWithPlaceholder
            src={bookmark.preview ?? ""}
            fallbackImage={bookmark.ogImageUrl ?? null}
            className="h-full w-full object-cover object-center mx-auto"
            alt={bookmark.title ?? "Preview"}
            style={
              bookmark.type === "IMAGE"
                ? {
                    objectFit: isVerticalImage ? "contain" : "cover",
                  }
                : {
                    objectFit: "cover",
                  }
            }
          />
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
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
