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
    
    // Check for page description
    await expect(page.locator("text=Manage your API keys to access the SaveIt.now API programmatically.")).toBeVisible();
    
    // Check for API keys section
    await expect(page.getByText('Your API Keys', { exact: true })).toBeVisible();
  });

  test("should create and display API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Click create API key button
    await page.click("button:has-text('Create API Key')");

    // Wait for dialog to open and fill in the API key name
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill('input[placeholder*="My Mobile App"]', "Test API Key");
    
    // Submit the form
    await page.click("button:has-text('Create Key')");

    // Wait for success dialog
    await expect(page.locator("text=API Key Created Successfully!")).toBeVisible();
    
    // Close the success dialog
    await page.click("button:has-text('Close')");
    
    // Check that the API key appears in the list
    await expect(page.locator("text=Test API Key")).toBeVisible();
  });

  test("should delete API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill('input[placeholder*="My Mobile App"]', "Test API Key to Delete");
    await page.click("button:has-text('Create Key')");
    
    // Close the success dialog
    await page.click("button:has-text('Close')");

    // Wait for the key to appear
    await expect(page.locator("text=Test API Key to Delete")).toBeVisible();

    // Click the delete button (Trash icon) - find the row containing the key name and click its delete button
    const keyRow = page.locator('div:has-text("Test API Key to Delete")').first();
    await keyRow.locator('button[class*="text-destructive"]').click();

    // Confirm deletion in the dialog
    await page.click("button:has-text('Delete')");

    // Wait for the page to refresh and check that the API key is no longer visible
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Test API Key to Delete")).not.toBeVisible();
  });

  test("should show API key creation with proper messaging", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill('input[placeholder*="My Mobile App"]', "Test Visibility Key");
    await page.click("button:has-text('Create Key')");

    // Check success dialog messaging
    await expect(page.locator("text=API Key Created Successfully!")).toBeVisible();
    await expect(page.locator("text=Make sure to copy it now - you won't be able to see it again.")).toBeVisible();
    
    // Check that the actual API key is displayed in the dialog
    await expect(page.locator('input[class*="font-mono"]')).toBeVisible();
    
    // Close the dialog
    await page.click("button:has-text('Close')");

    // Check that the key appears in the list after closing
    await expect(page.locator("text=Test Visibility Key")).toBeVisible();
  });
});