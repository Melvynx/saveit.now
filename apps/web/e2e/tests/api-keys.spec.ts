import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import { signInWithEmail } from "../utils/auth-test.js";
import { deleteApiKey } from "../utils/database-loader.mjs";
import { getTestConfig } from "../utils/test-config.js";

test.describe("API Keys Management", () => {
  test.beforeEach(async ({ page }) => {
    const testConfig = await getTestConfig();
    await signInWithEmail({ email: testConfig.userEmail, page });
    await deleteApiKey(testConfig.userId);
  });

  test("should display API keys page", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Check for page title
    await expect(page.locator("h1")).toContainText("API Keys");

    // Check for create API key button
    await expect(
      page.locator("button:has-text('Create API Key')"),
    ).toBeVisible();

    // Check for page description
    await expect(
      page.locator(
        "text=Manage your API keys to access the SaveIt.now API programmatically.",
      ),
    ).toBeVisible();

    // Check for API keys section
    await expect(
      page.getByText("Your API Keys", { exact: true }),
    ).toBeVisible();
  });

  test("should create and display API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Generate a unique API key name to avoid conflicts
    const uniqueKeyName = `Test API Key ${Date.now()}`;

    // Click create API key button
    await page.click("button:has-text('Create API Key')");

    // Wait for dialog to open and fill in the API key name
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill('input[placeholder*="My Mobile App"]', uniqueKeyName);

    // Submit the form
    await page.click("button:has-text('Create Key')");

    // Wait for success dialog
    await expect(
      page.locator("text=API Key Created Successfully!"),
    ).toBeVisible();

    // Close the success dialog
    await page.click("button:has-text('Close')");

    // Check that the API key appears in the list using exact text matching
    await expect(page.getByText(uniqueKeyName, { exact: true })).toBeVisible();
  });

  test("should delete API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    const apiKeyName = `${faker.location.city()}-dk`;

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill('input[placeholder*="My Mobile App"]', apiKeyName);
    await page.click("button:has-text('Create Key')");

    // Close the success dialog
    await page.click("button:has-text('Close')");

    // Wait for the key to appear
    await expect(page.locator(`text=${apiKeyName}`)).toBeVisible();

    // The test fails because the selector matches multiple buttons
    // Use a more specific selector that targets only the delete button for this specific API key
    // From the page snapshot, we can see each API key has its own row with text and a button

    // Find the delete button for the API key and click it
    await page.getByTestId(`delete-api-key-button-${apiKeyName}`).click();

    // Confirm deletion in the dialog

    await page.click("button:has-text('Delete')");

    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text=${apiKeyName}`)).not.toBeVisible();
  });

  test("should show API key creation with proper messaging", async ({
    page,
  }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.waitForSelector('input[placeholder*="My Mobile App"]');
    await page.fill(
      'input[placeholder*="My Mobile App"]',
      "Test Visibility Key",
    );
    await page.click("button:has-text('Create Key')");

    // Check success dialog messaging
    await expect(
      page.locator("text=API Key Created Successfully!"),
    ).toBeVisible();
    await expect(
      page.locator(
        "text=Make sure to copy it now - you won't be able to see it again.",
      ),
    ).toBeVisible();

    // Check that the actual API key is displayed in the dialog
    await expect(page.locator('input[class*="font-mono"]')).toBeVisible();

    // Close the dialog
    await page.click("button:has-text('Close')");

    // Check that the key appears in the list after closing
    await expect(page.locator("text=Test Visibility Key")).toBeVisible();
  });
});
