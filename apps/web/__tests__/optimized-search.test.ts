import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { optimizedSearch } from "../src/lib/search/optimized-search";
import { advancedSearch } from "../src/lib/search/advanced-search";
import { SearchOptions } from "../src/lib/search/search-helpers";

// Mock the OpenAI embedding functionality for tests
vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({
    embedding: Array.from({ length: 1536 }, () => Math.random() - 0.5)
  })
}));

vi.mock("../src/lib/search/embedding-cache", () => ({
  EmbeddingCache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined)
  }
}));

describe("OptimizedSearch", () => {
  const testUserId = "test-user-optimized-search";

  describe("Query Builder", () => {
    it("should handle tag-only search", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming", "web"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
      expect(result.hasMore).toBeTypeOf("boolean");
      expect(result.queryTime).toBeTypeOf("number");
    });

    it("should handle domain search", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        query: "github.com",
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
      expect(result.hasMore).toBeTypeOf("boolean");
    });

    it("should handle vector search", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        query: "javascript tutorial",
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
      expect(result.hasMore).toBeTypeOf("boolean");
    });

    it("should handle combined search (tags + vector)", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        query: "react hooks tutorial",
        tags: ["programming", "react"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
      expect(result.hasMore).toBeTypeOf("boolean");
    });

    it("should handle special filters", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        specialFilters: ["READ", "STAR"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
    });

    it("should handle type filters", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        types: ["ARTICLE", "BLOG"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
    });
  });

  describe("Performance Characteristics", () => {
    it("should return results faster than 500ms for simple queries", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 20
      };

      const start = performance.now();
      const result = await optimizedSearch(params);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it("should maintain score ordering", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        query: "react tutorial",
        limit: 10
      };

      const result = await optimizedSearch(params);

      // Scores should be in descending order
      for (let i = 1; i < result.bookmarks.length; i++) {
        expect(result.bookmarks[i-1].score).toBeGreaterThanOrEqual(result.bookmarks[i].score);
      }

      // All results should have valid scores
      result.bookmarks.forEach(bookmark => {
        expect(typeof bookmark.score).toBe("number");
        expect(bookmark.score).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty results gracefully", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        query: "nonexistent-search-term-xyz123",
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result.bookmarks).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.queryTime).toBeTypeOf("number");
    });

    it("should handle no search criteria (fallback to default browsing)", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);
    });

    it("should handle pagination correctly", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 5
      };

      const firstPage = await optimizedSearch(params);

      if (firstPage.hasMore && firstPage.nextCursor) {
        const secondPage = await optimizedSearch({
          ...params,
          cursor: firstPage.nextCursor
        });

        expect(secondPage.bookmarks).toBeInstanceOf(Array);

        // Ensure no duplicate results between pages
        const firstPageIds = new Set(firstPage.bookmarks.map(b => b.id));
        const secondPageIds = new Set(secondPage.bookmarks.map(b => b.id));

        const intersection = new Set([...firstPageIds].filter(x => secondPageIds.has(x)));
        expect(intersection.size).toBe(0);
      }
    });
  });

  describe("Fallback Behavior", () => {
    it("should fallback to advanced search on query errors", async () => {
      // Mock console.error to suppress expected error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock prisma to throw an error to test fallback
      const prismaSpy = vi.spyOn(require('@workspace/database').prisma, '$queryRawUnsafe')
        .mockRejectedValueOnce(new Error('Database connection error'));

      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      // Should still return results due to fallback
      expect(result).toBeDefined();
      expect(result.bookmarks).toBeInstanceOf(Array);

      // Restore mocks
      prismaSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("Result Format", () => {
    it("should return results in correct SearchResult format", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 5
      };

      const result = await optimizedSearch(params);

      result.bookmarks.forEach(bookmark => {
        expect(bookmark).toHaveProperty("id");
        expect(bookmark).toHaveProperty("url");
        expect(bookmark).toHaveProperty("title");
        expect(bookmark).toHaveProperty("summary");
        expect(bookmark).toHaveProperty("score");
        expect(bookmark).toHaveProperty("matchType");
        expect(bookmark.matchType).toMatch(/^(tag|domain|vector)$/);
      });
    });

    it("should include queryTime in response", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 20
      };

      const result = await optimizedSearch(params);

      expect(result.queryTime).toBeTypeOf("number");
      expect(result.queryTime).toBeGreaterThan(0);
    });

    it("should handle cursor-based pagination", async () => {
      const params: SearchOptions = {
        userId: testUserId,
        tags: ["programming"],
        limit: 10
      };

      const result = await optimizedSearch(params);

      if (result.hasMore) {
        expect(result.nextCursor).toBeTypeOf("string");
        expect(parseInt(result.nextCursor!)).toBeGreaterThan(0);
      } else {
        expect(result.nextCursor).toBeUndefined();
      }
    });
  });
});