import { describe, expect, it } from "vitest";
import {
  applyOpenFrequencyBoost,
  bookmarkToSearchResult,
  extractDomain,
  isDomainQuery,
  paginateResults,
  sortSearchResults,
  type SearchResultDTO,
} from "./helpers";

const result = (id: string, score: number): SearchResultDTO => ({
    _id: id,
    id,
    url: `https://example.com/${id}`,
    title: id,
    summary: null,
    preview: null,
    type: "PAGE",
    status: "READY",
    ogImageUrl: null,
    ogDescription: null,
    faviconUrl: null,
    score,
    matchType: "default",
    matchedTags: [],
    tags: [],
    createdAt: 1,
    metadata: null,
    openCount: 0,
    starred: false,
    read: false,
  });

describe("search helpers", () => {
  it("detects and normalizes domain queries", () => {
    expect(isDomainQuery("example.com")).toBe(true);
    expect(isDomainQuery("https://www.example.com/path?q=1#hash")).toBe(true);
    expect(isDomainQuery("save this article")).toBe(false);
    expect(extractDomain("https://www.example.com/path?q=1#hash")).toBe(
      "example.com",
    );
  });

  it("sorts by score first and id as a stable tie breaker", () => {
    expect(sortSearchResults([result("a", 10), result("z", 10), result("b", 20)]))
      .toEqual([result("b", 20), result("z", 10), result("a", 10)]);
  });

  it("paginates from an id cursor", () => {
    const page = paginateResults(
      [result("c", 3), result("b", 2), result("a", 1)],
      "c",
      1,
    );

    expect(page.bookmarks).toEqual([result("b", 2)]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("b");
  });

  it("maps search results without leaking transcript metadata", () => {
    const mapped = bookmarkToSearchResult(
      {
        _id: "bookmark_123",
        userId: "user_123",
        url: "https://example.com",
        status: "READY",
        createdAt: 1,
        metadata: { transcript: "private", markdown: "public" },
        starred: true,
        read: false,
      },
      applyOpenFrequencyBoost(100, 3),
      "tag",
      ["docs"],
      3,
    );

    expect(mapped.metadata).toEqual({ markdown: "public" });
    expect(mapped.matchType).toBe("tag");
    expect(mapped.matchedTags).toEqual(["docs"]);
    expect(mapped.openCount).toBe(3);
    expect(mapped.score).toBeGreaterThan(100);
  });
});
