import { expect, test } from "@playwright/test";
import { signInWithEmail } from "../utils/auth-test";
import { generateTestUserData } from "../utils/test-data";

test.describe("API v1 Endpoints", () => {
  let apiKey: string;
  let testUserData: any;

  test.beforeEach(async ({ page }) => {
    testUserData = generateTestUserData();
    await signInWithEmail({ email: testUserData.email, page });

    // Create an API key for testing
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");
    
    await page.click("button:has-text('Create API Key')");
    await page.fill("input[name='name']", "Test API Key");
    await page.click("button:has-text('Create Key')");
    
    // Wait for the key to appear and extract it
    await expect(page.locator("text=Test API Key")).toBeVisible();
    
    // Show the key to copy it
    await page.click("button:has-text('Show'), button:has(svg)");
    
    // Extract the API key from the page
    const keyElement = page.locator("code").first();
    apiKey = await keyElement.textContent() || "";
    
    expect(apiKey).toBeTruthy();
    expect(apiKey.length).toBeGreaterThan(10);
  });

  test("should create bookmark via API", async ({ request }) => {
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "https://example.com",
        transcript: "This is a test bookmark",
        metadata: { source: "test" },
      },
    });

    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmark).toBeDefined();
    expect(responseData.bookmark.url).toBe("https://example.com");
    expect(responseData.bookmark.id).toBeDefined();
  });

  test("should reject invalid URL in create bookmark", async ({ request }) => {
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "not-a-valid-url",
      },
    });

    expect(response.status()).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Invalid URL format");
  });

  test("should search bookmarks via API", async ({ request }) => {
    // First create a bookmark
    await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "https://example.com/search-test",
        transcript: "This is a searchable bookmark",
      },
    });

    // Then search for it
    const response = await request.get("/api/v1/bookmarks?query=searchable&limit=10", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(Array.isArray(responseData.bookmarks)).toBe(true);
  });

  test("should reject requests without API key", async ({ request }) => {
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        url: "https://example.com",
      },
    });

    expect(response.status()).toBe(401);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Missing authorization header");
  });

  test("should reject requests with invalid API key", async ({ request }) => {
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": "Bearer invalid-api-key",
        "Content-Type": "application/json",
      },
      data: {
        url: "https://example.com",
      },
    });

    expect(response.status()).toBe(401);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Invalid API key");
  });

  test("should handle search with filters", async ({ request }) => {
    // Create bookmarks with different types
    await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "https://youtube.com/watch?v=123",
        transcript: "YouTube video",
      },
    });

    await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "https://example.com/article",
        transcript: "Article content",
      },
    });

    // Search with type filter
    const response = await request.get("/api/v1/bookmarks?types=YOUTUBE&limit=5", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmarks).toBeDefined();
    expect(responseData.hasMore).toBeDefined();
  });

  test("should validate search parameters", async ({ request }) => {
    // Test with invalid limit
    const response = await request.get("/api/v1/bookmarks?limit=150", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    expect(response.status()).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Validation error");
  });
});