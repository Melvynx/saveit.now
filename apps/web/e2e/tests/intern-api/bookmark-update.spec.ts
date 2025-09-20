import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { setupAuthentication } from "../../auth.setup.js";
import { getPrismaClient } from "../../utils/database-loader.mjs";
import { generateId } from "../../utils/test-data.js";

const prisma = getPrismaClient();

test.describe.skip("Bookmark Update API", () => {
  let apiContext: APIRequestContext;
  let articleBookmarkId: string;
  let youtubeBookmarkId: string;
  let pageBookmarkId: string;

  test.beforeAll(async ({ playwright, browser }) => {
    const page = await browser.newPage();
    await setupAuthentication({ page });
    await page.close();

    apiContext = await playwright.request.newContext({
      storageState: "playwright/.auth/user.json",
      baseURL: "http://localhost:3000",
    });

    // Create test bookmarks via API (which automatically associates with authenticated user)
    const articleResponse = await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/article-test",
        metadata: {
          title: "Test Article",
          description: "A test article for bookmark update tests",
        },
      },
    });
    const articleResult = await articleResponse.json();
    articleBookmarkId = articleResult.bookmark.id;

    // Update the bookmark to be ARTICLE type via Prisma (since the API might not set specific types)
    await prisma.bookmark.update({
      where: { id: articleBookmarkId },
      data: { type: "ARTICLE" },
    });

    const youtubeResponse = await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://youtu.be/test-video-123",
        metadata: {
          title: "Test YouTube Video",
          description: "A test YouTube video for bookmark update tests",
        },
      },
    });
    const youtubeResult = await youtubeResponse.json();
    youtubeBookmarkId = youtubeResult.bookmark.id;

    // Update the bookmark to be YOUTUBE type
    await prisma.bookmark.update({
      where: { id: youtubeBookmarkId },
      data: { type: "YOUTUBE" },
    });

    const pageResponse = await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/page-test",
        metadata: {
          title: "Test Page",
          description: "A test page for bookmark update tests",
        },
      },
    });
    const pageResult = await pageResponse.json();
    pageBookmarkId = pageResult.bookmark.id;

    // Update the bookmark to be PAGE type
    await prisma.bookmark.update({
      where: { id: pageBookmarkId },
      data: { type: "PAGE" },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test("should get a specific bookmark", async () => {
    const response = await apiContext.get(
      `/api/bookmarks/${articleBookmarkId}`,
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.id).toBe(articleBookmarkId);
    expect(result.bookmark.type).toBe("ARTICLE");
    expect(result.bookmark.url).toBe("https://example.com/article-test");
  });

  test("should return 404 for non-existent bookmark", async () => {
    const nonExistentId = generateId();
    const response = await apiContext.get(`/api/bookmarks/${nonExistentId}`);

    expect(response.status()).toBe(404);

    const result = await response.json();
    expect(result.error).toBe("Bookmark not found");
  });

  test("should update bookmark starred status", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${articleBookmarkId}`,
      {
        data: { starred: true },
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.starred).toBe(true);
    expect(result.bookmark.id).toBe(articleBookmarkId);

    // Verify in database
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: articleBookmarkId },
    });
    expect(dbBookmark?.starred).toBe(true);
  });

  test("should update bookmark read status for ARTICLE type", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${articleBookmarkId}`,
      {
        data: { read: true },
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.read).toBe(true);
    expect(result.bookmark.id).toBe(articleBookmarkId);

    // Verify in database
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: articleBookmarkId },
    });
    expect(dbBookmark?.read).toBe(true);
  });

  test("should update bookmark read status for YOUTUBE type", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${youtubeBookmarkId}`,
      {
        data: { read: true },
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.read).toBe(true);
    expect(result.bookmark.id).toBe(youtubeBookmarkId);

    // Verify in database
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: youtubeBookmarkId },
    });
    expect(dbBookmark?.read).toBe(true);
  });

  test("should reject read status update for PAGE type", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${pageBookmarkId}`,
      {
        data: { read: true },
      },
    );

    expect(response.status()).toBe(400);

    const result = await response.json();
    expect(result.error).toBe("Bookmark does not support read functionality");

    // Verify in database that it wasn't updated
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: pageBookmarkId },
    });
    expect(dbBookmark?.read).toBe(false);
  });

  test("should update both starred and read status simultaneously", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${youtubeBookmarkId}`,
      {
        data: { starred: true, read: false },
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.starred).toBe(true);
    expect(result.bookmark.read).toBe(false);
    expect(result.bookmark.id).toBe(youtubeBookmarkId);

    // Verify in database
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: youtubeBookmarkId },
    });
    expect(dbBookmark?.starred).toBe(true);
    expect(dbBookmark?.read).toBe(false);
  });

  test("should return 404 when updating non-existent bookmark", async () => {
    const nonExistentId = generateId();
    const response = await apiContext.patch(`/api/bookmarks/${nonExistentId}`, {
      data: { starred: true },
    });

    expect(response.status()).toBe(404);

    const result = await response.json();
    expect(result.error).toBe("Bookmark not found");
  });

  test("should handle empty PATCH request body", async () => {
    const response = await apiContext.patch(
      `/api/bookmarks/${articleBookmarkId}`,
      {
        data: {},
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.id).toBe(articleBookmarkId);
  });

  test("should delete a bookmark", async () => {
    // Create a temporary bookmark for deletion via API
    const tempResponse = await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/temp-delete",
        metadata: {
          title: "Temp Bookmark for Deletion",
          description: "A temporary bookmark that will be deleted",
        },
      },
    });
    const tempResult = await tempResponse.json();
    const tempBookmarkId = tempResult.bookmark.id;

    const response = await apiContext.delete(
      `/api/bookmarks/${tempBookmarkId}`,
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);

    // Verify bookmark is deleted from database
    const deletedBookmark = await prisma.bookmark.findUnique({
      where: { id: tempBookmarkId },
    });
    expect(deletedBookmark).toBeNull();
  });

  test("should return 404 when deleting non-existent bookmark", async () => {
    const nonExistentId = generateId();
    const response = await apiContext.delete(`/api/bookmarks/${nonExistentId}`);

    expect(response.status()).toBe(404);

    const result = await response.json();
    expect(result.error).toBe("Bookmark not found");
  });

  test("should include tags in PATCH response", async () => {
    // Create a tag via API which automatically associates with authenticated user
    const tagResponse = await apiContext.post("/api/tags", {
      data: { name: "test-patch-tag" },
    });
    const tagResult = await tagResponse.json();
    const tagId = tagResult.tag.id;

    // Associate the tag with the bookmark
    await prisma.bookmarkTag.create({
      data: {
        bookmarkId: articleBookmarkId,
        tagId: tagId,
      },
    });

    const response = await apiContext.patch(
      `/api/bookmarks/${articleBookmarkId}`,
      {
        data: { starred: false },
      },
    );

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.tags).toBeDefined();
    expect(Array.isArray(result.bookmark.tags)).toBeTruthy();
    expect(result.bookmark.tags.length).toBeGreaterThan(0);
    expect(result.bookmark.tags[0].tag.name).toBe("test-patch-tag");

    // Cleanup
    await prisma.bookmarkTag.deleteMany({
      where: { bookmarkId: articleBookmarkId },
    });
    await prisma.tag.delete({ where: { id: tagId } });
  });
});
