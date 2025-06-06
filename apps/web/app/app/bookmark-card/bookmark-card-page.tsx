"use client";

import { Bookmark } from "@workspace/database";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { useSearchParams } from "next/navigation";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { LinkWithQuery } from "./link-with-query";

interface BookmarkCardPageProps {
  bookmark: Bookmark;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const searchParams = useSearchParams();
  const domainName = new URL(bookmark.url).hostname;

  const metadata = bookmark.metadata as any;
  const isVerticalImage = metadata?.width < metadata?.height;

  return (
    <BookmarkCardContainer bookmark={bookmark}>
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
        <BookmarkCardActions url={bookmark.url} />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
