/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { setupAuthentication } from "../../auth.setup.js";

test.describe("Tags API", () => {
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

  test("should return tags for authenticated user", async () => {
    const response = await apiContext.get("/api/tags");

    expect(response.status()).toBe(200);

    const tags = await response.json();

    expect(Array.isArray(tags.tags)).toBeTruthy();
  });

  test("should filter tags by query parameter", async () => {
    await apiContext.post("/api/tags", {
      data: { name: "javascript-test" },
    });

    await apiContext.post("/api/tags", {
      data: { name: "react-test" },
    });

    const response = await apiContext.get("/api/tags?q=javascript");

    expect(response.status()).toBe(200);

    const { tags: filteredTags } = await response.json();
    expect(Array.isArray(filteredTags)).toBeTruthy();

    filteredTags.forEach((tag: any) => {
      expect(tag.name.toLowerCase()).toContain("javascript");
    });
  });

  test("should create a new tag", async () => {
    const tagName = `test-tag-${Date.now()}`;

    const response = await apiContext.post("/api/tags", {
      data: { name: tagName },
    });

    expect(response.status()).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.tag).toBeDefined();
    expect(result.tag.name).toBe(tagName);
    expect(result.tag.id).toBeDefined();
    expect(result.tag.type).toBe("USER");
  });
});
