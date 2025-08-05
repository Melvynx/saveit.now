"use client";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";
import { BookmarkCardTags } from "./bookmark-card-tags";

interface BookmarkCardPDFProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardPDF = ({ bookmark }: BookmarkCardPDFProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const metadata = bookmark.metadata as {
    pdfUrl?: string;
    screenshotUrl?: string;
  } | null;
  const pdfUrl = metadata?.pdfUrl || bookmark.url;
  const screenshotUrl = bookmark.ogImageUrl || metadata?.screenshotUrl;

  const handleClick = () => {
    // Open the stored PDF file
    window.open(pdfUrl, "_blank");
  };

  return (
    <BookmarkCardContainer
      bookmark={bookmark}
      className="h-64 break-inside-avoid-column cursor-pointer"
    >
      <BookmarkCardHeader
        className="h-full relative"
        style={{
          backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: screenshotUrl ? undefined : "#f3f4f6",
        }}
        onClick={handleClick}
      >
        <BookmarkCardActions
          url={pdfUrl}
          bookmarkId={bookmark.id}
          starred={bookmark.starred}
          read={bookmark.read}
          bookmarkType={bookmark.type}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle>
          {bookmark.title || "PDF Document"}
        </BookmarkCardTitle>
        <BookmarkCardDescription>
          {bookmark.summary || `PDF from ${domainName}`}
        </BookmarkCardDescription>
        {bookmark.tags && bookmark.tags.length > 0 && (
          <BookmarkCardTags
            bookmarkId={bookmark.id}
            tags={bookmark.tags.map((t) => t.tag)}
            className="mt-2"
          />
        )}
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
