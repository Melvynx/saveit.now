import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { getTestApiKey } from "../../utils/test-config.js";

test.describe("POST /api/v1/bookmarks", () => {
  test("should create bookmark via API", async ({ request }) => {
    const apiKey = await getTestApiKey();
    const url = faker.internet.url();

    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url,
        transcript: "This is a test bookmark",
        metadata: { source: "test" },
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmark).toBeDefined();
    expect(new URL(responseData.bookmark.url).href).toBe(new URL(url).href);
    expect(responseData.bookmark.id).toBeDefined();
  });

  test("should reject invalid URL in create bookmark", async ({ request }) => {
    const apiKey = await getTestApiKey();

    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url: "not-a-valid-url",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("should reject requests without API key", async ({ request }) => {
    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        url: faker.internet.url(),
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
        Authorization: "Bearer invalid-api-key",
        "Content-Type": "application/json",
      },
      data: {
        url: faker.internet.url(),
      },
    });

    expect(response.status()).toBe(401);

    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.error).toContain("Invalid API key");
  });

  test("should create bookmark with metadata", async ({ request }) => {
    const apiKey = await getTestApiKey();
    const url = faker.internet.url();

    const metadata = {
      source: "api-test",
      priority: "high",
      tags: ["test", "automation"],
    };

    const response = await request.post("/api/v1/bookmarks", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        url,
        transcript: "Test bookmark with metadata",
        metadata,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.bookmark.url).toBe(new URL(url).href);
  });
});
