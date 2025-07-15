import { expect, test } from "@playwright/test";
import { signInWithEmail } from "e2e/utils/auth-test";
import { getUserEmail } from "e2e/utils/test-data";
import { prisma, seedTestBookmarks } from "e2e/utils/database";

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
    const testEmail = getUserEmail();
    await signInWithEmail({ email: testEmail, page });

    // Get the user to create a bookmark for them
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      throw new Error("Test user not found");
    }

    // Create some test bookmarks to ensure there are bookmarks available
    await seedTestBookmarks(user.id, 3);

    // Create a specific bookmark for our test
    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://example.com/test-star-bookmark",
        title: "Test Star Bookmark",
        summary: "This is a test bookmark for star functionality",
        faviconUrl: "https://example.com/favicon.ico",
        userId: user.id,
        type: "PAGE",
        status: "READY",
        starred: false, // Start unstarred
        metadata: {},
      },
    });

    // Navigate to the app page
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Wait a bit for the page to fully load
    await page.waitForTimeout(2000);

    // Find any bookmark card and click it - we just need to get to the bookmark page
    const bookmarkCard = page.locator('[data-testid="bookmark-card-page"]').first();
    await expect(bookmarkCard).toBeVisible();
    await bookmarkCard.click();

    // Wait for the dialog to be visible first
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Find the star button - it should be in the dialog header
    const starButton = page.locator('[data-testid="star-button"]').first();
    await expect(starButton).toBeVisible();

    // Check that the star is initially unstarred (should have text-muted-foreground class)
    const starIcon = starButton.locator("svg");
    await expect(starIcon).toHaveClass(/text-muted-foreground/);

    // Click the star button
    await starButton.click({ force: true });

    // Wait for the optimistic update - star should now be filled (yellow)
    await expect(starIcon).toHaveClass(/fill-yellow-400/);
    await expect(starIcon).toHaveClass(/text-yellow-400/);

    // Verify the bookmark is starred in the database
    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(updatedBookmark?.starred).toBe(true);

    // Click the star button again to unstar
    await starButton.click({ force: true });

    // Wait for the optimistic update - star should now be unstarred
    await expect(starIcon).toHaveClass(/text-muted-foreground/);
    await expect(starIcon).not.toHaveClass(/fill-yellow-400/);

    // Verify the bookmark is unstarred in the database
    const unstarredBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(unstarredBookmark?.starred).toBe(false);

    // Clean up the test bookmark
    await prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  });
});
