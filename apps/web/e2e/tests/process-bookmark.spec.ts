import { expect, test } from "@playwright/test";
import { signInWithEmail } from "e2e/utils/auth-test";
import { getUserEmail } from "e2e/utils/test-data";

test.describe("Process bookmarks tests", () => {
  test("should process bookmark", async ({ page }) => {
    await signInWithEmail({ email: getUserEmail(), page });

    // after creating an account, check at least one pending card with "saveit.now" is visible
    const pendingCardTitle = page.locator(
      '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:text("saveit.now")',
    );
    await expect(pendingCardTitle.first()).toBeVisible();

    // wait for all pending cards with "saveit.now" to disappear (processing done)
    await expect(
      page.locator(
        '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:text("saveit.now")',
      ),
    ).toHaveCount(0, { timeout: 30000 });

    // now check for processed card
    const bookmarkCardPage = page.locator(
      '[data-testid="bookmark-card-page"] [data-slot="card-title"]:text("saveit.now")',
    );
    await expect(bookmarkCardPage.first()).toBeVisible();
    await bookmarkCardPage.first().click();

    await expect(page).toHaveURL(/app\/b\/[a-zA-Z0-9]+/);
  });
});
