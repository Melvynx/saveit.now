import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { setupAuthentication } from "../../auth.setup.js";

test.describe("Bookmark Tags API", () => {
  let apiContext: APIRequestContext;
  let testBookmarkId: string;

  test.beforeAll(async ({ playwright, browser }) => {
    const page = await browser.newPage();
    await setupAuthentication({ page });
    await page.close();

    apiContext = await playwright.request.newContext({
      storageState: "playwright/.auth/user.json",
      baseURL: "http://localhost:3000",
    });

    // Create a test bookmark for tag operations
    const bookmarkResponse = await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/test-bookmark-for-tags",
        metadata: {
          title: "Test Bookmark for Tags",
          description: "A bookmark used for testing tag operations",
        },
      },
    });

    const bookmarkResult = await bookmarkResponse.json();
    testBookmarkId = bookmarkResult.bookmark.id;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test("should get empty tags for new bookmark", async () => {
    const response = await apiContext.get(`/api/bookmarks/${testBookmarkId}/tags`);

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(0);
  });

  test("should add tags to bookmark", async () => {
    const tagsToAdd = ["javascript", "testing", "api"];

    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: tagsToAdd },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(3);

    const tagNames = result.tags.map((tag: { name: string }) => tag.name);
    expect(tagNames).toContain("javascript");
    expect(tagNames).toContain("testing");
    expect(tagNames).toContain("api");

    // Verify all tags have proper structure
    result.tags.forEach((tag: { id: string; name: string; type: string }) => {
      expect(tag.id).toBeDefined();
      expect(tag.name).toBeDefined();
      expect(tag.type).toBe("USER");
    });
  });

  test("should get existing tags for bookmark", async () => {
    const response = await apiContext.get(`/api/bookmarks/${testBookmarkId}/tags`);

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(3);

    const tagNames = result.tags.map((tag: { name: string }) => tag.name);
    expect(tagNames).toContain("javascript");
    expect(tagNames).toContain("testing");
    expect(tagNames).toContain("api");
  });

  test("should update bookmark tags (remove and add)", async () => {
    const newTags = ["javascript", "frontend", "react"]; // Keep javascript, remove testing/api, add frontend/react

    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: newTags },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(3);

    const tagNames = result.tags.map((tag: { name: string }) => tag.name);
    expect(tagNames).toContain("javascript");
    expect(tagNames).toContain("frontend");
    expect(tagNames).toContain("react");
    expect(tagNames).not.toContain("testing");
    expect(tagNames).not.toContain("api");
  });

  test("should remove all tags from bookmark", async () => {
    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: [] },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(0);
  });

  test("should handle duplicate tags gracefully", async () => {
    const tagsWithDuplicates = ["javascript", "javascript", "react", "react"];

    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: tagsWithDuplicates },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(2); // Should only have unique tags

    const tagNames = result.tags.map((tag: { name: string }) => tag.name);
    expect(tagNames).toContain("javascript");
    expect(tagNames).toContain("react");
  });

  test("should return 404 for non-existent bookmark", async () => {
    const fakeBookmarkId = "non-existent-bookmark-id";

    const getResponse = await apiContext.get(`/api/bookmarks/${fakeBookmarkId}/tags`);
    expect(getResponse.status()).toBe(404);

    const patchResponse = await apiContext.patch(`/api/bookmarks/${fakeBookmarkId}/tags`, {
      data: { tags: ["test"] },
    });
    expect(patchResponse.status()).toBe(404);
  });

  test("should validate request body for PATCH", async () => {
    // Missing tags field
    const missingTagsResponse = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: {},
    });
    expect(missingTagsResponse.status()).toBe(400);

    // Invalid tags type (not an array)
    const invalidTagsResponse = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: "not-an-array" },
    });
    expect(invalidTagsResponse.status()).toBe(400);

    // Invalid tag item (not a string)
    const invalidTagItemResponse = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: [123, "valid-tag"] },
    });
    expect(invalidTagItemResponse.status()).toBe(400);
  });

  test("should handle empty tag names", async () => {
    const tagsWithEmpty = ["", "  ", "valid-tag", ""];

    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: tagsWithEmpty },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBeTruthy();
    expect(result.tags.length).toBe(1); // Should only have the valid tag

    const tagNames = result.tags.map((tag: { name: string }) => tag.name);
    expect(tagNames).toContain("valid-tag");
  });

  test("should handle long tag names", async () => {
    const longTagName = "a".repeat(100); // 100 characters
    const veryLongTagName = "b".repeat(500); // 500 characters

    const response = await apiContext.patch(`/api/bookmarks/${testBookmarkId}/tags`, {
      data: { tags: [longTagName, veryLongTagName] },
    });

    // Should succeed (assuming no length validation) or return appropriate error
    expect([200, 400]).toContain(response.status());
  });
});