"use client";

import { Bookmark } from "@workspace/database";
import { FileText } from "lucide-react";

import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
} from "./bookmark-card-base";

interface BookmarkCardPDFProps {
  bookmark: Bookmark;
}

export const BookmarkCardPDF = ({ bookmark }: BookmarkCardPDFProps) => {
  const domainName = new URL(bookmark.url).hostname;
  const metadata = bookmark.metadata as { pdfUrl?: string; screenshotUrl?: string } | null;
  const pdfUrl = metadata?.pdfUrl || bookmark.url;
  const screenshotUrl = bookmark.ogImageUrl || metadata?.screenshotUrl;

  const handleClick = () => {
    // Open the stored PDF file
    window.open(pdfUrl, '_blank');
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
        {/* PDF Icon Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <BookmarkCardActions
          url={pdfUrl}
          bookmarkId={bookmark.id}
          starred={bookmark.starred || false}
          read={bookmark.read || false}
          bookmarkType={bookmark.type}
        />
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <BookmarkCardTitle className="text-sm">
          {bookmark.title || "PDF Document"}
        </BookmarkCardTitle>
        <BookmarkCardDescription className="text-xs line-clamp-2">
          {bookmark.summary || `PDF from ${domainName}`}
        </BookmarkCardDescription>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};