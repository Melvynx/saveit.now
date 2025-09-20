"use client";

import { Bookmark } from "@workspace/database";

import { BookmarkCardError } from "./bookmark-card-error";
import { BookmarkCardImage } from "./bookmark-card-image";
import { BookmarkCardPage } from "./bookmark-card-page";
import { BookmarkCardPDF } from "./bookmark-card-pdf";
import { BookmarkCardPending } from "./bookmark-card-pending";
import { BookmarkCardProduct } from "./bookmark-card-product";
import { BookmarkCardTweet } from "./bookmark-card-tweet";
import { BookmarkCardYouTube } from "./bookmark-card-youtube";

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export const BookmarkCard = ({ bookmark }: BookmarkCardProps) => {
  // Handle error state
  if (bookmark.status === "ERROR") {
    return <BookmarkCardError bookmark={bookmark} />;
  }

  // Handle pending/processing states
  if (bookmark.status === "PENDING" || bookmark.status === "PROCESSING") {
    return <BookmarkCardPending bookmark={bookmark} />;
  }

  // Handle different bookmark types
  switch (bookmark.type) {
    case "YOUTUBE":
      return <BookmarkCardYouTube bookmark={bookmark} />;

    case "IMAGE":
      // Special case: standalone image for masonry layout
      return <BookmarkCardImage bookmark={bookmark} />;

    case "TWEET":
      return <BookmarkCardTweet bookmark={bookmark} />;

    case "PDF":
      return <BookmarkCardPDF bookmark={bookmark} />;

    case "PRODUCT":
      return <BookmarkCardProduct bookmark={bookmark} />;

    case "PAGE":
    case "ARTICLE":
    default:
      return <BookmarkCardPage bookmark={bookmark} />;
  }
};

// Re-export individual components for direct usage if needed
export { BookmarkCardBase } from "./bookmark-card-base";
export { BookmarkCardError } from "./bookmark-card-error";
export { BookmarkCardImage } from "./bookmark-card-image";
export { BookmarkCardInput } from "./bookmark-card-input";
export { BookmarkCardLoadMore } from "./bookmark-card-load-more";
export { BookmarkCardPage } from "./bookmark-card-page";
export { BookmarkCardPDF } from "./bookmark-card-pdf";
export { BookmarkCardPending } from "./bookmark-card-pending";
export { BookmarkCardPricing } from "./bookmark-card-pricing";
export { BookmarkCardProduct } from "./bookmark-card-product";
export { BookmarkCardTweet } from "./bookmark-card-tweet";
export { BookmarkCardYouTube } from "./bookmark-card-youtube";
