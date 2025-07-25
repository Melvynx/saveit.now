import { expect, test } from "@playwright/test";
import { changelogEntries } from "../../src/lib/changelog/changelog-data.js";
import { signInWithEmail } from "../utils/auth-test.js";
import { getUserEmail } from "../utils/test-data.js";

test.describe("Changelog Notifications", () => {
  // Use the same user for dismiss-related tests
  const SHARED_TEST_USER_EMAIL = getUserEmail();

  // Get the latest changelog entry dynamically
  const latestEntry = changelogEntries[0];
  test("new user should see changelog notification after login", async ({
    page,
  }) => {
    // Login with a new user
    await signInWithEmail({ email: getUserEmail(), page });

    // Navigate to app to ensure user is authenticated
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Wait for React hydration and API calls to complete
    await page.waitForTimeout(3000);

    // Check if changelog notification appears
    const notification = page.locator('[data-testid="changelog-notification"]');

    // The notification should be visible for new users
    await expect(notification).toBeVisible({ timeout: 15000 });

    // Verify notification content
    await expect(notification.locator('text="What\'s New"')).toBeVisible();
    await expect(
      notification.locator('button[aria-label="Close notification"]'),
    ).toBeVisible();

    // Verify notification can be clicked to open dialog
    await notification.click();

    // Dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator(`text="What's New in v${latestEntry?.version}"`),
    ).toBeVisible();
  });

  test("user can dismiss changelog notification", async ({ page }) => {
    // Login with shared user
    await signInWithEmail({ email: SHARED_TEST_USER_EMAIL, page });

    // Wait for notification to appear
    const notification = page.locator('[data-testid="changelog-notification"]');
    await expect(notification).toBeVisible({ timeout: 15000 });

    // Click the close button
    const closeButton = page.getByRole("button", {
      name: "Close notification",
    });
    await closeButton.click();

    // Notification should disappear
    await expect(notification).not.toBeVisible({ timeout: 10000 });

    // Refresh page to verify notification doesn't reappear
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Notification should still not be visible
    await expect(notification).not.toBeVisible({ timeout: 10000 });
  });

  test("changelog dialog shows full details", async ({ page }) => {
    // Login and navigate to app with a new user
    await signInWithEmail({ email: getUserEmail(), page });

    // Wait for and click notification
    const notification = page.locator('[data-testid="changelog-notification"]');
    await expect(notification).toBeVisible({ timeout: 15000 });
    await notification.click();

    // Verify dialog content
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Check for dialog elements
    await expect(
      dialog.locator(`text="What's New in v${latestEntry?.version}"`),
    ).toBeVisible();
    await expect(dialog.locator('text="Changes:"')).toBeVisible();
    await expect(dialog.locator('text="View full changelog"')).toBeVisible();
    await expect(dialog.locator('button:has-text("Got it!")')).toBeVisible();

    // Close dialog
    await dialog.locator('button:has-text("Got it!")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("/changelog/versions page redirects to /changelog", async ({ page }) => {
    await page.goto("/changelog/versions");

    // Should redirect to /changelog
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/changelog");
  });
});
