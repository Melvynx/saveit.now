import { expect, test } from "@playwright/test";

test("docs page loads with h1 and article", async ({ page }) => {
  await page.goto("/docs/getting-started");
  
  // Check for h1 heading
  await expect(page.locator("h1")).toBeVisible();
  
  // Check for article content
  await expect(page.locator("article")).toBeVisible();
});