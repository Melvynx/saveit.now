import { expect, test } from "@playwright/test";
import { getTestApiKey } from "../../utils/test-config.js";

test.describe("GET /api/v1/tags", () => {
  test.beforeAll(async ({ request }) => {
    // Create some test bookmarks with tags for testing
    const apiKey = await getTestApiKey();

    const testBookmarks = [
      {
        url: "https://example.com/tags-test-1",
        transcript: "This bookmark is about javascript programming",
      },
      {
        url: "https://example.com/tags-test-2", 
        transcript: "This bookmark is about react framework",
      },
      {
        url: "https://example.com/tags-test-3",
        transcript: "This bookmark is about typescript language",
      },
    ];

    // Create test bookmarks to generate tags
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

  test("should list tags via API", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get("/api/v1/tags?limit=10", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.tags).toBeDefined();
    expect(Array.isArray(responseData.tags)).toBe(true);
    expect(responseData.hasMore).toBeDefined();
    expect(typeof responseData.hasMore).toBe("boolean");

    // Verify tag structure
    if (responseData.tags.length > 0) {
      const tag = responseData.tags[0];
      expect(tag).toHaveProperty("id");
      expect(tag).toHaveProperty("name");
      expect(tag).toHaveProperty("type");
      expect(tag).toHaveProperty("bookmarkCount");
      expect(typeof tag.bookmarkCount).toBe("number");
      expect(tag.bookmarkCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should list tags without query parameters (defaults)", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get("/api/v1/tags", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.tags).toBeDefined();
    expect(Array.isArray(responseData.tags)).toBe(true);
    expect(responseData.hasMore).toBeDefined();
    expect(responseData.nextCursor).toBeDefined();
  });

  test("should reject requests without API key", async ({ request }) => {
    const response = await request.get("/api/v1/tags");

    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Missing authorization header");
  });

  test("should reject requests with invalid API key", async ({ request }) => {
    const response = await request.get("/api/v1/tags", {
      headers: {
        Authorization: "Bearer invalid-api-key",
      },
    });

    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Invalid API key");
  });

  test("should validate limit parameters", async ({ request }) => {
    const apiKey = await getTestApiKey();

    // Test with invalid limit (too high)
    const response = await request.get("/api/v1/tags?limit=150", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(400);

    const responseData = await response.json();
    expect(responseData.message).toBe("Invalid query");
    expect(responseData.errors).toBeDefined();
    expect(Array.isArray(responseData.errors)).toBe(true);
  });

  test("should validate limit parameters (too low)", async ({ request }) => {
    const apiKey = await getTestApiKey();

    // Test with invalid limit (too low)
    const response = await request.get("/api/v1/tags?limit=0", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(400);

    const responseData = await response.json();
    expect(responseData.message).toBe("Invalid query");
    expect(responseData.errors).toBeDefined();
    expect(Array.isArray(responseData.errors)).toBe(true);
  });

  test("should handle pagination with cursor", async ({ request }) => {
    const apiKey = await getTestApiKey();

    // First request with small limit
    const firstResponse = await request.get("/api/v1/tags?limit=2", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(firstResponse.status()).toBe(200);
    const firstData = await firstResponse.json();
    expect(firstData.success).toBe(true);
    expect(firstData.tags).toBeDefined();

    if (firstData.nextCursor && firstData.hasMore) {
      // Second request with cursor
      const secondResponse = await request.get(
        `/api/v1/tags?limit=2&cursor=${firstData.nextCursor}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      expect(secondResponse.status()).toBe(200);
      const secondData = await secondResponse.json();
      expect(secondData.success).toBe(true);
      expect(secondData.tags).toBeDefined();
      expect(Array.isArray(secondData.tags)).toBe(true);

      // Ensure different results from pagination
      if (firstData.tags.length > 0 && secondData.tags.length > 0) {
        expect(firstData.tags[0].id).not.toBe(secondData.tags[0].id);
      }
    }
  });

  test("should respect limit parameter", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get("/api/v1/tags?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.tags).toBeDefined();
    expect(responseData.tags.length).toBeLessThanOrEqual(1);
  });

  test("should handle custom limit within bounds", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.get("/api/v1/tags?limit=5", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.tags).toBeDefined();
    expect(responseData.tags.length).toBeLessThanOrEqual(5);
  });
});