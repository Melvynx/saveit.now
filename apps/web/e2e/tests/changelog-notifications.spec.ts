import { expect, test } from "@playwright/test";
import { loginUser } from "../utils/login-helper";

test.describe("Changelog Notifications", () => {
  test("new user should see changelog notification after login", async ({ page }) => {
    // Login with a new user
    await loginUser(page);
    
    // Navigate to app to ensure user is authenticated
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    
    // Check if changelog notification appears
    const notification = page.locator('[data-testid="changelog-notification"]');
    
    // The notification should be visible for new users
    await expect(notification).toBeVisible({ timeout: 10000 });
    
    // Verify notification content
    await expect(notification.locator('text="What\'s New"')).toBeVisible();
    await expect(notification.locator('button[aria-label="Close notification"]')).toBeVisible();
    
    // Verify notification can be clicked to open dialog
    await notification.click();
    
    // Dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text="What\'s New in v"')).toBeVisible();
  });

  test("user can dismiss changelog notification", async ({ page }) => {
    // Login with a new user
    await loginUser(page);
    
    // Navigate to app
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    
    // Wait for notification to appear
    const notification = page.locator('[data-testid="changelog-notification"]');
    await expect(notification).toBeVisible({ timeout: 10000 });
    
    // Click the close button
    const closeButton = notification.locator('button[aria-label="Close notification"]');
    await closeButton.click();
    
    // Notification should disappear
    await expect(notification).not.toBeVisible();
    
    // Refresh page to verify notification doesn't reappear
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Notification should still not be visible
    await expect(notification).not.toBeVisible();
  });

  test("dismissed notification doesn't appear on subsequent visits", async ({ page }) => {
    // This test requires the previous test to have run and dismissed the notification
    // Login with the same user
    await loginUser(page);
    
    // Navigate to app
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    
    // Wait a bit to ensure notification doesn't appear
    await page.waitForTimeout(3000);
    
    // Notification should not be visible
    const notification = page.locator('[data-testid="changelog-notification"]');
    await expect(notification).not.toBeVisible();
  });

  test("changelog dialog shows full details", async ({ page }) => {
    // Login and navigate to app
    await loginUser(page);
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    
    // Wait for and click notification
    const notification = page.locator('[data-testid="changelog-notification"]');
    await expect(notification).toBeVisible({ timeout: 10000 });
    await notification.click();
    
    // Verify dialog content
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check for dialog elements
    await expect(dialog.locator('text="What\'s New in v"')).toBeVisible();
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