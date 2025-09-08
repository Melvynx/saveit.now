import { expect, test } from "@playwright/test";
import { signInWithEmail } from "e2e/utils/auth-test";
import { prisma, seedTestBookmarks } from "e2e/utils/database";
import { getUserEmail, TEST_EMAIL } from "e2e/utils/test-data";
import { nanoid } from "nanoid";

test.describe("Process bookmarks tests", () => {
  test("should process bookmark", async ({ page }) => {
    await signInWithEmail({ email: getUserEmail(), page });

    await page
      .getByRole("textbox", { name: "Search bookmarks or type @" })
      .fill(`https://resend.com?a=${nanoid(2)}&isPlaywrightTest=true`);
    await page.getByRole("button", { name: "Add" }).click();

    // Wait for network to settle after adding bookmark
    await page.waitForLoadState("networkidle");

    // Check if bookmark is already processed or wait for pending state
    const processedCards = page
      .locator('[data-testid="bookmark-card-page"] [data-slot="card-title"]')
      .filter({ hasText: /^resend\.com.*/ });

    const isAlreadyProcessed = (await processedCards.count()) > 0;

    if (!isAlreadyProcessed) {
      // Wait for pending card to appear if not already processed
      await expect(
        page
          .locator(
            '[data-testid="bookmark-card-pending"] [data-slot="card-title"]',
          )
          .filter({ hasText: /^resend\.com/ })
          .first(),
      ).toBeVisible({ timeout: 10000 });
    }

    // Wait for processing to complete if not already processed
    if (!isAlreadyProcessed) {
      await expect(
        page
          .locator(
            '[data-testid="bookmark-card-pending"] [data-slot="card-title"]',
          )
          .filter({ hasText: /^resend\.com/ }),
      ).toHaveCount(0, { timeout: 180000 });
    }

    // now check for processed card
    const bookmarkCardPage = page
      .locator('[data-testid="bookmark-card-page"] [data-slot="card-title"]')
      .filter({ hasText: /^resend\.com.*/ });
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
        id: nanoid(),
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

    // Wait a bit for the server action to complete
    await page.waitForTimeout(1000);

    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(updatedBookmark?.starred).toBe(true);

    await starButton.click({ force: true });

    await expect(starIcon).toHaveClass(/text-muted-foreground/);
    await expect(starIcon).not.toHaveClass(/fill-yellow-400/);

    // Wait a bit for the server action to complete
    await page.waitForTimeout(1000);

    const unstarredBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
      select: { starred: true },
    });
    expect(unstarredBookmark?.starred).toBe(false);

    await prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  });

  test("delete", async ({ page }) => {
    await signInWithEmail({ email: TEST_EMAIL, page });

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!user) throw new Error("Test user not found");

    await seedTestBookmarks(user.id, 3);

    const bookmark = await prisma.bookmark.create({
      data: {
        id: nanoid(),
        url: "https://example.com/test-delete-bookmark",
        title: "Test Delete Bookmark",
        summary: "This is a test bookmark for delete functionality",
        faviconUrl: "https://example.com/favicon.ico",
        userId: user.id,
        type: "PAGE",
        status: "READY",
        starred: false,
        read: false,
        metadata: {},
      },
    });

    // Refresh the page to ensure the bookmark is loaded
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Find the bookmark card and click it to open the detail view
    const bookmarkCard = page
      .locator('[data-testid="bookmark-card-page"]')
      .filter({ hasText: "Test Delete Bookmark" });

    await expect(bookmarkCard).toBeVisible({ timeout: 10000 });
    await bookmarkCard.click();

    // Wait for the dialog to be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Find the delete button in the bookmark detail view
    const deleteButton = page.getByRole("button", { name: /delete/i });
    await expect(deleteButton).toBeVisible();

    // Click delete button
    await deleteButton.click();

    // Wait for confirmation dialog
    await expect(
      page.getByRole("alertdialog", { name: "Delete Bookmark" }),
    ).toBeVisible();

    // Click the confirmation delete button
    const confirmDeleteButton = page.getByRole("button", { name: "Delete" });
    await expect(confirmDeleteButton).toBeVisible();
    await confirmDeleteButton.click();

    // Should redirect to /app after deletion
    await expect(page).toHaveURL("/app");

    // Wait for server action to complete
    await page.waitForTimeout(1000);

    // Verify bookmark is deleted from database
    const deletedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
    });
    expect(deletedBookmark).toBeNull();

    // Verify bookmark card is no longer visible on the page
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await expect(
      page
        .locator('[data-testid="bookmark-card-page"]')
        .filter({ hasText: "Test Delete Bookmark" }),
    ).not.toBeVisible();
  });
});
