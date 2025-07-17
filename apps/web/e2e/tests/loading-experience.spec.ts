import { test, expect } from '@playwright/test';
import { getUserEmail } from '../utils/test-data';
import { getOTPCodeFromDatabase } from '../utils/otp-helper';

test.describe('Loading Experience', () => {
  test('should show search bar immediately even when not authenticated', async ({ page }) => {
    // Navigate to the app page
    await page.goto('/app');

    // Check that the search bar is visible immediately
    const searchBar = page.getByRole('textbox', { name: /search/i });
    await expect(searchBar).toBeVisible({ timeout: 2000 });

    // Verify that we eventually get redirected to the signin page (unauthenticated user)
    await expect(page).toHaveURL(/.*signin.*/, { timeout: 5000 });
  });

  test('should show header immediately even when not authenticated', async ({ page }) => {
    // Navigate to the app page
    await page.goto('/app');

    // Check that the header is visible immediately
    const header = page.getByRole('banner');
    await expect(header).toBeVisible({ timeout: 2000 });

    // Verify that we eventually get redirected to the signin page (unauthenticated user)
    await expect(page).toHaveURL(/.*signin.*/, { timeout: 5000 });
  });

  test('should show skeleton loaders while authentication is pending', async ({ page }) => {
    // Navigate to the app page
    await page.goto('/app');

    // Check that skeleton loaders are visible
    const skeletons = page.locator('.bg-muted.rounded-md');
    await expect(skeletons.first()).toBeVisible({ timeout: 2000 });
  });
  
  test('authenticated users should see their bookmarks', async ({ page }) => {
    // First authenticate the user
    await page.goto('/signin');
    
    const testEmail = getUserEmail();
    
    // Fill in a test email
    await page.fill('input[placeholder="john@doe.com"]', testEmail);
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Get and enter OTP code
    const otpCode = await getOTPCodeFromDatabase(`sign-in-otp-${testEmail}`);
    if (!otpCode) {
      throw new Error("OTP code not found");
    }
    await page.getByRole("textbox").fill(otpCode);
    
    // Wait for authentication to complete and redirect to /app
    await page.goto('/app');
    
    // Check that the search bar is visible immediately
    const searchBar = page.getByRole('textbox', { name: /search/i });
    await expect(searchBar).toBeVisible({ timeout: 2000 });
    
    // Check that we see bookmark content (not redirected to signin)
    await expect(page).not.toHaveURL(/.*signin.*/, { timeout: 5000 });
    
    // Check for bookmark cards or content that would only be visible to authenticated users
    // This might need to be adjusted based on the actual structure of the page
    const bookmarkContent = page.locator('.grid');
    await expect(bookmarkContent).toBeVisible({ timeout: 5000 });
  });
});