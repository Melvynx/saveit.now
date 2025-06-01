"use client";

import { Bookmark } from "@workspace/database";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { DEFAULT_PREVIEW } from "../bookmark.default";
import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";

interface BookmarkCardPageProps {
  bookmark: Bookmark;
}

export const BookmarkCardPage = ({ bookmark }: BookmarkCardPageProps) => {
  const searchParams = useSearchParams();
  const domainName = new URL(bookmark.url).hostname;

  const metadata = bookmark.metadata as any;
  const isVerticalImage = metadata?.width < metadata?.height;

  const bookmarkUrl = {
    pathname: "/app",
    query: {
      ...Object.fromEntries(searchParams.entries()),
      b: bookmark.id,
    },
  };

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader height={HEADER_HEIGHT}>
        {() => (
          <>
            <Link href={bookmarkUrl}>
              <ImageWithPlaceholder
                src={bookmark.preview ?? ""}
                fallbackImage={bookmark.ogImageUrl ?? DEFAULT_PREVIEW}
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
            </Link>
            <BookmarkCardActions url={bookmark.url} />
          </>
        )}
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>{domainName}</BookmarkCardTitle>
        <BookmarkCardDescription>{bookmark.title}</BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
