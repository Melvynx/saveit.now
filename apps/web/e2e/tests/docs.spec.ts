import { expect, test } from "@playwright/test";

test("docs page loads with h1 and content", async ({ page }) => {
  await page.goto("/docs/getting-started");

  await expect(page.locator("h1")).toBeVisible();

  await expect(page.locator(".typography")).toBeVisible();
});
