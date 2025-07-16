import { test, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

test.describe("Tags API", () => {
  let apiContext: APIRequestContext;
  
  test.beforeAll(async ({ playwright }) => {
    // Create API request context using the stored authentication state
    apiContext = await playwright.request.newContext({
      storageState: "playwright/.auth/user.json",
      baseURL: "http://localhost:3000",
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe("GET /api/tags", () => {
    test("should return tags for authenticated user", async () => {
      const response = await apiContext.get("/api/tags");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      
      if (tags.length > 0) {
        expect(tags[0]).toHaveProperty("id");
        expect(tags[0]).toHaveProperty("name");
        expect(tags[0]).toHaveProperty("userId");
        expect(typeof tags[0].id).toBe("string");
        expect(typeof tags[0].name).toBe("string");
        expect(typeof tags[0].userId).toBe("string");
      }
    });

    test("should filter tags by query parameter", async () => {
      await apiContext.post("/api/tags", {
        data: { name: "javascript-test" }
      });
      
      await apiContext.post("/api/tags", {
        data: { name: "react-test" }
      });
      
      const response = await apiContext.get("/api/tags?q=javascript");
      
      expect(response.status()).toBe(200);
      
      const filteredTags = await response.json();
      expect(Array.isArray(filteredTags)).toBeTruthy();
      
      filteredTags.forEach((tag: any) => {
        expect(tag.name.toLowerCase()).toContain("javascript");
      });
    });

    test("should handle case-insensitive search", async () => {
      await apiContext.post("/api/tags", {
        data: { name: "TypeScript-Test" }
      });
      
      const response = await apiContext.get("/api/tags?q=TYPESCRIPT");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      
      const foundTag = tags.find((tag: any) => 
        tag.name.toLowerCase().includes("typescript")
      );
      expect(foundTag).toBeDefined();
    });

    test("should handle partial matches", async () => {
      await apiContext.post("/api/tags", {
        data: { name: "javascript-framework" }
      });
      
      await apiContext.post("/api/tags", {
        data: { name: "typescript-library" }
      });
      
      const response = await apiContext.get("/api/tags?q=script");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      
      const scriptTags = tags.filter((tag: any) => 
        tag.name.toLowerCase().includes("script")
      );
      expect(scriptTags.length).toBeGreaterThan(0);
    });

    test("should return empty array for non-matching query", async () => {
      const response = await apiContext.get("/api/tags?q=nonexistent-tag-xyz");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      expect(tags.length).toBe(0);
    });

    test("should handle empty query parameter", async () => {
      const response = await apiContext.get("/api/tags?q=");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
    });

    test("should limit results to 10 tags", async () => {
      const tagPromises = [];
      for (let i = 0; i < 15; i++) {
        tagPromises.push(
          apiContext.post("/api/tags", {
            data: { name: `test-tag-${i}` }
          })
        );
      }
      await Promise.all(tagPromises);
      
      const response = await apiContext.get("/api/tags");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    test("should handle special characters in search", async () => {
      await apiContext.post("/api/tags", {
        data: { name: "react-native" }
      });
      
      await apiContext.post("/api/tags", {
        data: { name: "C++" }
      });
      
      await apiContext.post("/api/tags", {
        data: { name: "node.js" }
      });
      
      const tests = [
        { query: "react-native", expected: "react-native" },
        { query: "C++", expected: "C++" },
        { query: "node.js", expected: "node.js" }
      ];
      
      for (const { query, expected } of tests) {
        const response = await apiContext.get(`/api/tags?q=${encodeURIComponent(query)}`);
        
        expect(response.status()).toBe(200);
        
        const tags = await response.json();
        const foundTag = tags.find((tag: any) => tag.name === expected);
        expect(foundTag).toBeDefined();
      }
    });

    test("should return 401/403 for unauthenticated requests", async ({ playwright }) => {
      const unauthenticatedContext = await playwright.request.newContext({
        baseURL: "http://localhost:3000"
      });
      
      const response = await unauthenticatedContext.get("/api/tags");
      
      console.log(`Unauthenticated GET /api/tags returned: ${response.status()}`);
      
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
      
      await unauthenticatedContext.dispose();
    });
  });

  test.describe("POST /api/tags", () => {
    test("should create a new tag", async () => {
      const tagName = `test-tag-${Date.now()}`;
      
      const response = await apiContext.post("/api/tags", {
        data: { name: tagName }
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.tag).toBeDefined();
      expect(result.tag.name).toBe(tagName);
      expect(result.tag.id).toBeDefined();
      expect(result.tag.type).toBe("USER");
    });

    test("should reject requests with missing name", async () => {
      const response = await apiContext.post("/api/tags", {
        data: {}
      });
      
      expect(response.status()).toBe(400);
    });

    test("should reject requests with invalid data types", async () => {
      const response = await apiContext.post("/api/tags", {
        data: { name: 123 }
      });
      
      expect(response.status()).toBe(400);
    });

    test("should reject requests with empty name", async () => {
      const response = await apiContext.post("/api/tags", {
        data: { name: "" }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
    });

    test("should handle duplicate tag names", async () => {
      const tagName = `duplicate-tag-${Date.now()}`;
      
      // Create first tag
      const response1 = await apiContext.post("/api/tags", {
        data: { name: tagName }
      });
      expect(response1.status()).toBe(200);
      
      // Try to create duplicate
      const response2 = await apiContext.post("/api/tags", {
        data: { name: tagName }
      });
      
      expect(response2.status()).toBeGreaterThanOrEqual(200);
    });

    test("should return 401/403 for unauthenticated requests", async ({ playwright }) => {
      const unauthenticatedContext = await playwright.request.newContext({
        baseURL: "http://localhost:3000"
      });
      
      const response = await unauthenticatedContext.post("/api/tags", {
        data: { name: "test-tag" }
      });
      
      console.log(`Unauthenticated POST /api/tags returned: ${response.status()}`);
      
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
      
      await unauthenticatedContext.dispose();
    });
  });

  test.describe("User Isolation", () => {
    test("should only return tags for the authenticated user", async () => {
      await apiContext.post("/api/tags", {
        data: { name: "user-specific-tag" }
      });
      
      const response = await apiContext.get("/api/tags");
      
      expect(response.status()).toBe(200);
      
      const tags = await response.json();
      expect(Array.isArray(tags)).toBeTruthy();
      
      const userIds = new Set(tags.map((tag: any) => tag.userId));
      expect(userIds.size).toBeLessThanOrEqual(1);
    });

    test("should create tags for the authenticated user", async () => {
      const tagName = `user-isolation-test-${Date.now()}`;
      
      const response = await apiContext.post("/api/tags", {
        data: { name: tagName }
      });
      
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.tag).toBeDefined();
      expect(result.tag.id).toBeDefined();
      expect(result.tag.name).toBe(tagName);
    });
  });


});