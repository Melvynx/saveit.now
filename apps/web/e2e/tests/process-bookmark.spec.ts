import { expect, test } from "@playwright/test";
import { signInWithEmail } from "e2e/utils/auth-test";
import { prisma, seedTestBookmarks } from "e2e/utils/database";
import { getUserEmail, TEST_EMAIL } from "e2e/utils/test-data";

test.describe("Process bookmarks tests", () => {
  test("should process bookmark", async ({ page }) => {
    await signInWithEmail({ email: getUserEmail(), page });

    // after creating an account, check that a pending card with "SaveIt.now" is visible
    await expect(
      page
        .locator(
          '[data-testid="bookmark-card-pending"] [data-slot="card-title"]:has-text("SaveIt.now")',
        )
        .first(),
    ).toBeVisible();

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
      await page.reload({ waitUntil: "networkidle" });
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

  test("star", async ({ page }) => {
    await signInWithEmail({ email: TEST_EMAIL, page });

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!user) throw new Error("Test user not found");

    await seedTestBookmarks(user.id, 3);

    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://example.com/test-star-bookmark",
        title: "Test Star Bookmark",
        summary: "This is a test bookmark for star functionality",
        faviconUrl: "https://example.com/favicon.ico",
        userId: user.id,
        type: "PAGE",
        status: "READY",
        starred: false,
        metadata: {},
      },
    });

    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bookmarkCard = page
      .locator('[data-testid="bookmark-card-page"]')
      .first();
    await expect(bookmarkCard).toBeVisible();
    await bookmarkCard.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Use getByRole('banner').getByTestId('star-button') as requested
    const starButton = page.getByRole("banner").getByTestId("star-button");
    await expect(starButton).toBeVisible();

    const starIcon = starButton.locator("svg");
    await expect(starIcon).toHaveClass(/text-muted-foreground/);

    await starButton.click({ force: true });

    await expect(starIcon).toHaveClass(/fill-yellow-400/);
    await expect(starIcon).toHaveClass(/text-yellow-400/);

    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(updatedBookmark?.starred).toBe(true);

    await starButton.click({ force: true });

    await expect(starIcon).toHaveClass(/text-muted-foreground/);
    await expect(starIcon).not.toHaveClass(/fill-yellow-400/);

    const unstarredBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(unstarredBookmark?.starred).toBe(false);

    await prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  });
});
