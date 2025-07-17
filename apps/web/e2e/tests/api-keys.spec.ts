import { expect, test } from "@playwright/test";
import { signInWithEmail } from "../utils/auth-test";
import { generateTestUserData } from "../utils/test-data";

test.describe("API Keys Management", () => {
  test.beforeEach(async ({ page }) => {
    const testUserData = generateTestUserData();
    await signInWithEmail({ email: testUserData.email, page });
  });

  test("should display API keys page", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Check for page title
    await expect(page.locator("h1")).toContainText("API Keys");
    
    // Check for create API key button
    await expect(page.locator("button:has-text('Create API Key')")).toBeVisible();
    
    // Check for API usage documentation
    await expect(page.locator("text=Base URL")).toBeVisible();
    await expect(page.locator("text=https://saveit.now/api/v1")).toBeVisible();
  });

  test("should create and display API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Click create API key button
    await page.click("button:has-text('Create API Key')");

    // Fill in the API key name
    await page.fill("input[name='name']", "Test API Key");
    
    // Submit the form
    await page.click("button:has-text('Create Key')");

    // Wait for success message
    await expect(page.locator("text=API key created successfully")).toBeVisible();
    
    // Check that the API key appears in the list
    await expect(page.locator("text=Test API Key")).toBeVisible();
    
    // Check for masked key display (the current implementation shows "Key hidden for security")
    await expect(page.locator("text=Key hidden for security")).toBeVisible();
  });

  test("should delete API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.fill("input[name='name']", "Test API Key to Delete");
    await page.click("button:has-text('Create Key')");

    // Wait for the key to appear
    await expect(page.locator("text=Test API Key to Delete")).toBeVisible();

    // Set up dialog handler before clicking delete
    page.on("dialog", dialog => dialog.accept());

    // Click the delete button (Trash icon) - look for the button within the API key row containing the test key
    const apiKeyRow = page.locator('div').filter({ hasText: 'Test API Key to Delete' });
    await apiKeyRow.locator('button').click();

    // Wait for the page to reload and check that the API key is no longer visible
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Test API Key to Delete")).not.toBeVisible();
    
    // Look for either success message or confirm key is gone
    const successMessage = page.locator("text=API key deleted successfully");
    const failureMessage = page.locator("text=Failed to delete API key");
    
    // If there's a failure message, the test should fail
    await expect(failureMessage).not.toBeVisible();
  });

  test("should show API key creation with proper messaging", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.fill("input[name='name']", "Test Visibility Key");
    await page.click("button:has-text('Create Key')");

    // Wait for the key to appear
    await expect(page.locator("text=Test Visibility Key")).toBeVisible();

    // Check that the key is properly hidden with security message
    await expect(page.locator("text=Key hidden for security")).toBeVisible();
    await expect(page.locator("text=Only visible during creation")).toBeVisible();
  });
});