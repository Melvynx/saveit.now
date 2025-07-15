import { expect, test } from "@playwright/test";
import { signInWithEmail } from "e2e/utils/auth-test";
import { getUserEmail } from "e2e/utils/test-data";

test.describe("Process bookmarks tests", () => {
  test("should process bookmark", async ({ page }) => {
    await signInWithEmail({ email: getUserEmail(), page });

    // after creating an account, check at least one pending card with "SaveIt.now" is visible
    const pendingCardTitle = page.locator(
      '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:has-text("SaveIt.now")',
    );
    await expect(pendingCardTitle.first()).toBeVisible();

    // wait for all pending cards with "SaveIt.now" to disappear (processing done)
    // hard refresh page every 30 seconds to check status, maximum 3 minutes
    const startTime = Date.now();
    const maxWaitTime = 180000; // 3 minutes
    const refreshInterval = 30000; // 30 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      const pendingCards = page.locator(
        '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:has-text("SaveIt.now")',
      );
      
      const pendingCount = await pendingCards.count();
      if (pendingCount === 0) {
        break; // Processing is done
      }
      
      // Wait 30 seconds before hard refreshing
      await page.waitForTimeout(refreshInterval);
      await page.reload({ waitUntil: 'networkidle' });
    }
    
    // Final check that processing is complete
    await expect(
      page.locator(
        '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:has-text("SaveIt.now")',
      ),
    ).toHaveCount(0);

    // now check for processed card
    const bookmarkCardPage = page.locator(
      '[data-testid="bookmark-card-page"] [data-slot="card-title"]:has-text("SaveIt.now")',
    );
    await expect(bookmarkCardPage.first()).toBeVisible();
    await bookmarkCardPage.first().click();

    await expect(page).toHaveURL(/app\/b\/[a-zA-Z0-9]+/);
  });
});
