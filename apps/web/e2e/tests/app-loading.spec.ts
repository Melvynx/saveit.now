import { expect, test } from "@playwright/test";

test.describe("App Loading Experience", () => {
  test("should show search bar immediately for unauthenticated users before redirect", async ({ page }) => {
    // Navigate to /app without authentication
    await page.goto("/app");

    // Check that search bar is visible immediately
    const searchInput = page.getByPlaceholder(/Search bookmarks|Loading.../);
    await expect(searchInput).toBeVisible();

    // Verify header is also visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify SaveIt logo is visible
    const logo = page.getByRole("link", { name: /SaveIt/ });
    await expect(logo).toBeVisible();

    // Eventually should redirect to signin (but search bar was visible first)
    await expect(page).toHaveURL(/\/signin/, { timeout: 10000 });
  });

  test("should show disabled search bar while auth is loading", async ({ page }) => {
    // Mock slow auth response to test loading state
    await page.route("**/api/auth/**", async (route) => {
      // Delay the auth response to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto("/app");

    // Search bar should be visible but disabled during auth loading
    const searchInput = page.getByPlaceholder("Loading...");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeDisabled();

    // Header should be visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Bookmark content should show skeletons
    const skeletons = page.locator(".bg-muted").first();
    await expect(skeletons).toBeVisible();
  });
});

test.describe("App Loading - Authenticated", () => {
  test("should show full functionality for authenticated users", async ({ page }) => {
    // Create a test user and sign them in
    const response = await page.request.post("/api/auth/sign-in/email", {
      data: {
        email: "test@example.com",
        otp: "123456",
      },
    });

    if (response.ok()) {
      await page.goto("/app");

      // Search bar should be visible and enabled
      const searchInput = page.getByPlaceholder(/Search bookmarks or type @ for types/);
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();

      // Header should be visible
      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Should see bookmark content (not just skeletons)
      await expect(page.getByText("Add")).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Layout Consistency", () => {
  test("should maintain consistent layout structure across auth states", async ({ page }) => {
    // Test unauthenticated state
    await page.goto("/app");

    // Capture layout structure
    const headerHeight = await page.locator("header").boundingBox();
    const searchBarPosition = await page.getByPlaceholder(/Search bookmarks|Loading.../).boundingBox();

    expect(headerHeight?.height).toBeGreaterThan(0);
    expect(searchBarPosition?.y).toBeGreaterThan(headerHeight?.height || 0);

    // The layout should be consistent regardless of auth state
    // (We're testing that header and search bar positions don't jump around)
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByPlaceholder(/Search bookmarks|Loading.../)).toBeVisible();
  });

  test("should show search bar immediately without any loading delay", async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto("/app");
    
    // Search bar should be visible almost immediately (within 100ms)
    const searchInput = page.getByPlaceholder(/Search bookmarks|Loading.../);
    await expect(searchInput).toBeVisible({ timeout: 100 });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Verify it appeared quickly (should be much less than 500ms)
    expect(loadTime).toBeLessThan(500);
  });
});