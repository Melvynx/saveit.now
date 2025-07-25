import { expect, test } from "@playwright/test";
import { getTestApiKey } from "../../utils/test-config.js";

test.describe("GET /api/v1/bookmarks", () => {
  test.beforeAll(async ({ request }) => {
    // Create some test bookmarks for search tests
    const apiKey = await getTestApiKey();

    const testBookmarks = [
      {
        url: "https://example.com/search-test-1",
        transcript: "This is a searchable bookmark about technology",
      },
      {
        url: "https://youtube.com/watch?v=test123",
        transcript: "YouTube video about programming",
      },
      {
        url: "https://example.com/article-test",
        transcript: "Article content for testing search",
      },
    ];

    // Create test bookmarks
    for (const bookmark of testBookmarks) {
      await request.post("/api/v1/bookmarks", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        data: bookmark,
      });
    }
  });

  test("should search bookmarks via API", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get(
      "/api/v1/bookmarks?query=searchable&limit=10",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const responseData = await response.json();
    expect(response.status()).toBe(200);

    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(Array.isArray(responseData.bookmarks)).toBe(true);
  });

  test("should list bookmarks without query", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get("/api/v1/bookmarks?limit=5", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(Array.isArray(responseData.bookmarks)).toBe(true);
    expect(responseData.hasMore).toBeDefined();
  });

  test("should filter bookmarks by type", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get(
      "/api/v1/bookmarks?types=YOUTUBE&limit=5",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(responseData.hasMore).toBeDefined();
  });

  test("should reject requests without API key", async ({ request }) => {
    const response = await request.get("/api/v1/bookmarks");

    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Missing authorization header");
  });

  test("should reject requests with invalid API key", async ({ request }) => {
    const response = await request.get("/api/v1/bookmarks", {
      headers: {
        Authorization: "Bearer invalid-api-key",
      },
    });

    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Invalid API key");
  });

  test("should validate search parameters", async ({ request }) => {
    const apiKey = await getTestApiKey();

    // Test with invalid limit
    const response = await request.get("/api/v1/bookmarks?limit=150", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(400);
  });

  test("should handle search with multiple filters", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get(
      "/api/v1/bookmarks?query=test&types=ARTICLE,PAGE&limit=5",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(Array.isArray(responseData.bookmarks)).toBe(true);
  });

  test("should handle pagination with cursor", async ({ request }) => {
    const apiKey = await getTestApiKey();

    // First request
    const firstResponse = await request.get("/api/v1/bookmarks?limit=2", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(firstResponse.status()).toBe(200);
    const firstData = await firstResponse.json();

    if (firstData.nextCursor) {
      // Second request with cursor
      const secondResponse = await request.get(
        `/api/v1/bookmarks?limit=2&cursor=${firstData.nextCursor}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      expect(secondResponse.status()).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.success).toBe(true);
      expect(secondData.bookmarks).toBeDefined();
    }
  });
});
