import { expect, test } from "@playwright/test";

test("blog page loads and post navigation works", async ({ page }) => {
  await page.goto("/posts");

  // Check for h1 heading
  await expect(page.locator("h1")).toBeVisible();

  // Find and click on a blog post link
  const postLink = page.locator("main a[href^='/posts/']").first();

  // Check if post exists and click it
  if (await postLink.isVisible()) {
    const href = await postLink.getAttribute("href");

    // Verify URL is correct
    await postLink.click();
    await expect(page).toHaveURL(new RegExp(href!));
    await expect(page).toHaveURL(/\/posts\/.+/);
  }
});
