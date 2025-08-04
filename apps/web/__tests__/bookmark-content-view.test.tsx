import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BookmarkContentView } from "../src/features/bookmarks/bookmark-content-view.js";

vi.mock("@/env", () => {
  {
    1;
  }
});

const baseBookmark: BookmarkViewType = {
  id: "1",
  url: "https://example.com/article",
  title: "Example Article Title",
  summary: "This is a summary of the article",
  ogImageUrl: "https://example.com/og-image.jpg",
  metadata: {},
  starred: false,
  read: false,
  status: "COMPLETED" as const,
  faviconUrl: "https://example.com/favicon.ico",
  userId: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  note: null,
  type: "BLOG",
  ogDescription: "Example description",
};

const youtubeBookmark: BookmarkViewType = {
  ...baseBookmark,
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up (Official Video)",
  type: "YOUTUBE",
  metadata: {
    youtubeId: "dQw4w9WgXcQ",
    transcript: "Never gonna give you up, never gonna let you down...",
    transcriptSource: "youtube",
    transcriptAvailable: true,
  },
};

describe("BookmarkContentView Visual Hierarchy", () => {
  describe("YouTube bookmarks", () => {
    it("should display video title as prominent element for YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={youtubeBookmark} />);

      // The title should be in the large variant (prominent)
      const titleElement = screen.getByText(
        "Rick Astley - Never Gonna Give You Up (Official Video)",
      );
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass("text-lg", "font-semibold");
    });

    it("should display URL as muted element for YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={youtubeBookmark} />);

      // The URL should be in the muted variant (secondary)
      const urlElement = screen.getByText(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
      expect(urlElement).toBeInTheDocument();
      expect(urlElement).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("should maintain external link tracking on title for YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={youtubeBookmark} />);

      const titleElement = screen.getByText(
        "Rick Astley - Never Gonna Give You Up (Official Video)",
      );

      // Should have cursor pointer and hover styling
      expect(titleElement).toHaveClass("cursor-pointer", "hover:underline");
    });
  });

  describe("Non-YouTube bookmarks", () => {
    it("should display URL as prominent element for non-YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={baseBookmark} />);

      // The URL should be in the large variant (prominent)
      const urlElement = screen.getByText("https://example.com/article");
      expect(urlElement).toBeInTheDocument();
      expect(urlElement).toHaveClass("text-lg", "font-semibold");
    });

    it("should display title as muted element for non-YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={baseBookmark} />);

      // The title should be in the muted variant (secondary)
      const titleElement = screen.getByText("Example Article Title");
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("should maintain external link tracking on URL for non-YouTube bookmarks", () => {
      render(<BookmarkContentView bookmark={baseBookmark} />);

      const urlElement = screen.getByText("https://example.com/article");

      // Should have cursor pointer and hover styling
      expect(urlElement).toHaveClass("cursor-pointer", "hover:underline");
    });
  });

  describe("Edge cases", () => {
    it("should handle YouTube bookmarks with null title", () => {
      const youtubeWithNullTitle = {
        ...youtubeBookmark,
        title: null,
      };

      render(<BookmarkContentView bookmark={youtubeWithNullTitle} />);

      // Should still show URL as muted for YouTube type
      const urlElement = screen.getByText(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
      expect(urlElement).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("should handle bookmarks with null type as non-YouTube", () => {
      const bookmarkWithNullType = {
        ...baseBookmark,
        type: null,
      };

      render(<BookmarkContentView bookmark={bookmarkWithNullType} />);

      // Should behave like non-YouTube (URL prominent)
      const urlElement = screen.getByText("https://example.com/article");
      expect(urlElement).toHaveClass("text-lg", "font-semibold");
    });

    it("should handle different bookmark types correctly", () => {
      const blogBookmark = {
        ...baseBookmark,
        type: "BLOG" as const,
      };

      render(<BookmarkContentView bookmark={blogBookmark} />);

      // Should behave like non-YouTube (URL prominent)
      const urlElement = screen.getByText("https://example.com/article");
      expect(urlElement).toHaveClass("text-lg", "font-semibold");
    });
  });
});
