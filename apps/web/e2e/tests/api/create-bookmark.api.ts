import { expect, test } from "@playwright/test";
import { getTestApiKey } from "../../utils/test-config";

test.describe("POST /api/v1/bookmarks", () => {
  test("should create bookmark via API", async ({ request }) => {
    const apiKey = await getTestApiKey();
    
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
    const apiKey = await getTestApiKey();
    
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

  test("should create bookmark with metadata", async ({ request }) => {
    const apiKey = await getTestApiKey();
    
    const metadata = {
      source: "api-test",
      priority: "high",
      tags: ["test", "automation"]
    };
    
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "https://test-metadata.example.com",
        transcript: "Test bookmark with metadata",
        metadata,
      },
    });

    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmark.url).toBe("https://test-metadata.example.com");
  });
});