import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/pricing", "/docs", "/signin"];

test.describe("CI smoke", () => {
  for (const route of publicRoutes) {
    test(`renders ${route}`, async ({ page }) => {
      const response = await page.goto(route);

      expect(response?.status(), `${route} should return HTTP 200`).toBe(200);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        /CONVEX_SITE_URL is not set|Internal Server Error|No QueryClient set|HTTPError/i,
      );
    });
  }
});
