import { describe, it, expect } from "vitest";
import { BookmarkType, BookmarkStatus } from "@workspace/database";
import {
  isDomainQuery,
  extractDomain,
  applyOpenFrequencyBoost,
  isSearchQuery,
  buildSpecialFilterConditions,
  bookmarkToSearchResult,
  sortSearchResults,
  paginateResults,
  type SearchResult,
} from "../src/lib/search/search-helpers";

describe("search-helpers", () => {
  describe("isDomainQuery", () => {
    it("should return true for domain.com format", () => {
      expect(isDomainQuery("example.com")).toBe(true);
      expect(isDomainQuery("sub.example.com")).toBe(true);
      expect(isDomainQuery("my-site.io")).toBe(true);
    });

    it("should return true for www.domain.com format", () => {
      expect(isDomainQuery("www.example.com")).toBe(true);
      expect(isDomainQuery("www.sub.example.com")).toBe(true);
    });

    it("should return true for http(s)://domain.com format", () => {
      expect(isDomainQuery("https://example.com")).toBe(true);
      expect(isDomainQuery("http://example.com")).toBe(true);
      expect(isDomainQuery("https://www.example.com")).toBe(true);
    });

    it("should return false for non-domain queries", () => {
      expect(isDomainQuery("search terms")).toBe(false);
      expect(isDomainQuery("just text")).toBe(false);
      expect(isDomainQuery("")).toBe(false);
      expect(isDomainQuery("example")).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(isDomainQuery("  example.com  ")).toBe(true);
      expect(isDomainQuery("  search terms  ")).toBe(false);
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from simple domain", () => {
      expect(extractDomain("example.com")).toBe("example.com");
      expect(extractDomain("sub.example.com")).toBe("sub.example.com");
    });

    it("should remove protocol", () => {
      expect(extractDomain("https://example.com")).toBe("example.com");
      expect(extractDomain("http://example.com")).toBe("example.com");
    });

    it("should remove www", () => {
      expect(extractDomain("www.example.com")).toBe("example.com");
      expect(extractDomain("https://www.example.com")).toBe("example.com");
    });

    it("should remove path and parameters", () => {
      expect(extractDomain("example.com/path")).toBe("example.com");
      expect(extractDomain("example.com?param=value")).toBe("example.com");
      expect(extractDomain("example.com#section")).toBe("example.com");
      expect(extractDomain("example.com/path?param=value#section")).toBe("example.com");
    });

    it("should handle complex URLs", () => {
      expect(extractDomain("https://www.example.com/path?param=value#section")).toBe("example.com");
    });

    it("should handle whitespace", () => {
      expect(extractDomain("  example.com  ")).toBe("example.com");
    });
  });

  describe("applyOpenFrequencyBoost", () => {
    it("should return original score for 0 open count", () => {
      expect(applyOpenFrequencyBoost(100, 0)).toBe(100);
    });

    it("should apply logarithmic boost for positive open count", () => {
      const originalScore = 100;
      const boostedScore = applyOpenFrequencyBoost(originalScore, 5);
      
      // Should be greater than original
      expect(boostedScore).toBeGreaterThan(originalScore);
      
      // Should follow logarithmic formula: score + Math.log(openCount + 1) * 10
      const expectedBoost = Math.log(5 + 1) * 10;
      expect(boostedScore).toBeCloseTo(originalScore + expectedBoost, 5);
    });

    it("should apply logarithmic boost for higher open counts", () => {
      const score = 100;
      const boosted1 = applyOpenFrequencyBoost(score, 1);
      const boosted10 = applyOpenFrequencyBoost(score, 10);
      const boosted100 = applyOpenFrequencyBoost(score, 100);
      
      // Higher open counts should result in higher scores
      expect(boosted10).toBeGreaterThan(boosted1);
      expect(boosted100).toBeGreaterThan(boosted10);
      
      // But the increase should be logarithmic, not linear
      expect(boosted100 - boosted10).toBeLessThan(10 * (boosted10 - boosted1));
    });
  });

  describe("isSearchQuery", () => {
    it("should return true for non-empty queries", () => {
      expect(isSearchQuery("search term")).toBe(true);
      expect(isSearchQuery("a")).toBe(true);
      expect(isSearchQuery("  search  ")).toBe(true);
    });

    it("should return false for empty or whitespace queries", () => {
      expect(isSearchQuery("")).toBe(false);
      expect(isSearchQuery("  ")).toBe(false);
      expect(isSearchQuery(undefined)).toBe(false);
    });
  });

  describe("buildSpecialFilterConditions", () => {
    it("should return empty object for no filters", () => {
      expect(buildSpecialFilterConditions()).toEqual({});
      expect(buildSpecialFilterConditions([])).toEqual({});
    });

    it("should build READ filter condition", () => {
      const result = buildSpecialFilterConditions(["READ"]);
      expect(result).toEqual({
        read: true,
        type: {
          in: ["ARTICLE", "YOUTUBE"],
        },
      });
    });

    it("should build UNREAD filter condition", () => {
      const result = buildSpecialFilterConditions(["UNREAD"]);
      expect(result).toEqual({
        read: false,
        type: {
          in: ["ARTICLE", "YOUTUBE"],
        },
      });
    });

    it("should build STAR filter condition", () => {
      const result = buildSpecialFilterConditions(["STAR"]);
      expect(result).toEqual({
        starred: true,
      });
    });

    it("should combine multiple filters with OR", () => {
      const result = buildSpecialFilterConditions(["READ", "STAR"]);
      expect(result).toEqual({
        OR: [
          {
            read: true,
            type: {
              in: ["ARTICLE", "YOUTUBE"],
            },
          },
          {
            starred: true,
          },
        ],
      });
    });
  });

  describe("bookmarkToSearchResult", () => {
    const mockBookmark = {
      id: "bookmark-1",
      url: "https://example.com",
      title: "Test Bookmark",
      summary: "Test summary",
      preview: "Test preview",
      type: BookmarkType.ARTICLE,
      status: BookmarkStatus.PROCESSING,
      ogImageUrl: "https://example.com/image.jpg",
      ogDescription: "Test description",
      faviconUrl: "https://example.com/favicon.ico",
      createdAt: new Date("2023-01-01"),
      metadata: { test: "data" },
      starred: true,
      read: false,
    };

    it("should transform bookmark to search result with defaults", () => {
      const result = bookmarkToSearchResult(mockBookmark);
      
      expect(result).toEqual({
        id: "bookmark-1",
        url: "https://example.com",
        title: "Test Bookmark",
        summary: "Test summary",
        preview: "Test preview",
        type: BookmarkType.ARTICLE,
        status: BookmarkStatus.PROCESSING,
        ogImageUrl: "https://example.com/image.jpg",
        ogDescription: "Test description",
        faviconUrl: "https://example.com/favicon.ico",
        score: 0,
        matchType: "tag",
        matchedTags: undefined,
        createdAt: mockBookmark.createdAt,
        metadata: { test: "data" },
        openCount: undefined,
        starred: true,
        read: false,
      });
    });

    it("should transform bookmark with custom parameters", () => {
      const result = bookmarkToSearchResult(
        mockBookmark,
        95.5,
        "vector",
        ["tag1", "tag2"],
        5
      );
      
      expect(result.score).toBe(95.5);
      expect(result.matchType).toBe("vector");
      expect(result.matchedTags).toEqual(["tag1", "tag2"]);
      expect(result.openCount).toBe(5);
    });
  });

  describe("sortSearchResults", () => {
    const createSearchResult = (id: string, score: number): SearchResult => ({
      id,
      url: `https://example.com/${id}`,
      title: `Title ${id}`,
      summary: null,
      preview: null,
      type: BookmarkType.ARTICLE,
      status: BookmarkStatus.PROCESSING,
      ogImageUrl: null,
      ogDescription: null,
      faviconUrl: null,
      score,
      matchType: "tag",
    });

    it("should sort by score descending", () => {
      const results = [
        createSearchResult("1", 10),
        createSearchResult("2", 30),
        createSearchResult("3", 20),
      ];
      
      const sorted = sortSearchResults(results);
      expect(sorted.map((r: SearchResult) => r.score)).toEqual([30, 20, 10]);
    });

    it("should sort by ID descending for same scores", () => {
      const results = [
        createSearchResult("aaa", 10),
        createSearchResult("zzz", 10),
        createSearchResult("mmm", 10),
      ];
      
      const sorted = sortSearchResults(results);
      expect(sorted.map((r: SearchResult) => r.id)).toEqual(["zzz", "mmm", "aaa"]);
    });

    it("should combine score and ID sorting", () => {
      const results = [
        createSearchResult("aaa", 10),
        createSearchResult("zzz", 20),
        createSearchResult("mmm", 10),
      ];
      
      const sorted = sortSearchResults(results);
      expect(sorted.map((r: SearchResult) => r.id)).toEqual(["zzz", "mmm", "aaa"]);
    });
  });

  describe("paginateResults", () => {
    const createResults = (count: number): SearchResult[] => 
      Array.from({ length: count }, (_, i) => ({
        id: `id-${i}`,
        url: `https://example.com/${i}`,
        title: `Title ${i}`,
        summary: null,
        preview: null,
        type: BookmarkType.ARTICLE,
        status: BookmarkStatus.PROCESSING,
        ogImageUrl: null,
        ogDescription: null,
        faviconUrl: null,
        score: 100 - i,
        matchType: "tag" as const,
      }));

    it("should paginate without cursor", () => {
      const results = createResults(5);
      const paginated = paginateResults(results, undefined, 3);
      
      expect(paginated.bookmarks).toHaveLength(3);
      expect(paginated.bookmarks.map((r: SearchResult) => r.id)).toEqual(["id-0", "id-1", "id-2"]);
      expect(paginated.hasMore).toBe(true);
      expect(paginated.nextCursor).toBe("id-2");
    });

    it("should paginate with cursor", () => {
      const results = createResults(5);
      const paginated = paginateResults(results, "id-1", 2);
      
      expect(paginated.bookmarks).toHaveLength(2);
      expect(paginated.bookmarks.map((r: SearchResult) => r.id)).toEqual(["id-2", "id-3"]);
      expect(paginated.hasMore).toBe(true);
      expect(paginated.nextCursor).toBe("id-3");
    });

    it("should handle last page", () => {
      const results = createResults(3);
      const paginated = paginateResults(results, undefined, 5);
      
      expect(paginated.bookmarks).toHaveLength(3);
      expect(paginated.hasMore).toBe(false);
      expect(paginated.nextCursor).toBeUndefined();
    });

    it("should handle invalid cursor", () => {
      const results = createResults(3);
      const paginated = paginateResults(results, "invalid-id", 2);
      
      expect(paginated.bookmarks).toHaveLength(2);
      expect(paginated.bookmarks.map((r: SearchResult) => r.id)).toEqual(["id-0", "id-1"]);
    });
  });
});