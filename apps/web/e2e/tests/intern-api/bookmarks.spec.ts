import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { setupAuthentication } from "../../auth.setup.js";

test.describe("Bookmarks API", () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright, browser }) => {
    const page = await browser.newPage();
    await setupAuthentication({ page });
    await page.close();

    apiContext = await playwright.request.newContext({
      storageState: "playwright/.auth/user.json",
      baseURL: "http://localhost:3000",
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test("should create a normal bookmark", async () => {
    const bookmarkData = {
      url: "https://example.com/article",
      metadata: {
        title: "Example Article",
        description: "A test article for bookmark creation",
      },
    };

    const response = await apiContext.post("/api/bookmarks", {
      data: bookmarkData,
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.status).toBe("ok");
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.url).toBe(bookmarkData.url);
    expect(result.bookmark.id).toBeDefined();
  });

  test("should create a bookmark with YouTube transcript", async () => {
    const youtubeBookmarkData = {
      url: "https://youtu.be/xw4Rwf9Go-Q",
      transcript:
        "This is a sample transcript from the YouTube video about testing APIs. The video covers various topics including authentication, data validation, and error handling.",
      metadata: {
        title: "Testing APIs with Playwright",
        description: "A comprehensive guide to API testing",
        duration: "10:30",
        thumbnail: "https://img.youtube.com/vi/xw4Rwf9Go-Q/maxresdefault.jpg",
      },
    };

    const response = await apiContext.post("/api/bookmarks", {
      data: youtubeBookmarkData,
    });

    expect(response.status()).toBe(200);

    const result = await response.json();

    expect(result.status).toBe("ok");
    expect(result.bookmark).toBeDefined();
    expect(result.bookmark.url).toBe(youtubeBookmarkData.url);
    expect(result.bookmark.metadata.transcript).toBe(
      youtubeBookmarkData.transcript,
    );
    expect(result.bookmark.id).toBeDefined();
  });

  test("should return error for invalid URL", async () => {
    const invalidBookmarkData = {
      url: "not-a-valid-url",
    };

    const response = await apiContext.post("/api/bookmarks", {
      data: invalidBookmarkData,
    });

    expect(response.status()).toBe(400);
  });

  test("should return error for missing URL", async () => {
    const invalidBookmarkData = {
      metadata: {
        title: "Test without URL",
      },
    };

    const response = await apiContext.post("/api/bookmarks", {
      data: invalidBookmarkData,
    });

    expect(response.status()).toBe(400);
  });

  test("should get bookmarks for authenticated user", async () => {
    const response = await apiContext.get("/api/bookmarks");

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmarks).toBeDefined();
    expect(Array.isArray(result.bookmarks)).toBeTruthy();
  });

  test("should filter bookmarks by query parameter", async () => {
    await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/javascript-tutorial",
        metadata: {
          title: "JavaScript Tutorial",
          description: "Learn JavaScript fundamentals",
        },
      },
    });

    await apiContext.post("/api/bookmarks", {
      data: {
        url: "https://example.com/react-guide",
        metadata: {
          title: "React Guide",
          description: "Complete React development guide",
        },
      },
    });

    const response = await apiContext.get("/api/bookmarks?query=javascript");

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmarks).toBeDefined();
    expect(Array.isArray(result.bookmarks)).toBeTruthy();
  });

  test("should respect limit parameter", async () => {
    const response = await apiContext.get("/api/bookmarks?limit=1");

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.bookmarks).toBeDefined();
    expect(Array.isArray(result.bookmarks)).toBeTruthy();
    expect(result.bookmarks.length).toBeLessThanOrEqual(1);
  });

  test("should validate limit parameter boundaries", async () => {
    const tooLowResponse = await apiContext.get("/api/bookmarks?limit=0");
    expect(tooLowResponse.status()).toBe(400);

    const tooHighResponse = await apiContext.get("/api/bookmarks?limit=100");
    expect(tooHighResponse.status()).toBe(400);

    const validResponse = await apiContext.get("/api/bookmarks?limit=25");
    expect(validResponse.status()).toBe(200);
  });
});
