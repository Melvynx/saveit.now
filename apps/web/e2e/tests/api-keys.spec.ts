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
    await expect(page.locator("h1")).toContainText(/API keys/i);

    // Check for create API key button
    await expect(
      page.getByRole("button", { name: /create key/i }),
    ).toBeVisible();

    // Check for page description
    await expect(
      page.locator(
        "text=Create and revoke keys for programmatic SaveIt.now access.",
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
    await page.getByRole("button", { name: /create key/i }).click();

    // Wait for dialog to open and fill in the API key name
    const createDialog = page.getByRole("alertdialog");
    await expect(createDialog).toBeVisible();
    await createDialog
      .locator('input[placeholder*="My Mobile App"]')
      .fill(uniqueKeyName);

    // Submit the form
    await createDialog.getByRole("button", { name: "Create Key" }).click();

    // Wait for success dialog
    const successDialog = page.getByRole("alertdialog");
    await expect(
      successDialog.getByText("API Key Created Successfully!"),
    ).toBeVisible();

    // Close the success dialog
    await successDialog.getByRole("button", { name: "Close" }).click();

    // Check that the API key appears in the list using exact text matching
    await expect(page.getByText(uniqueKeyName, { exact: true })).toBeVisible();
  });

  test("should delete API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    const apiKeyName = `${faker.location.city()}-dk`;

    // Create an API key first
    await page.getByRole("button", { name: /create key/i }).click();
    const createDialog = page.getByRole("alertdialog");
    await expect(createDialog).toBeVisible();
    await createDialog
      .locator('input[placeholder*="My Mobile App"]')
      .fill(apiKeyName);
    await createDialog.getByRole("button", { name: "Create Key" }).click();

    // Close the success dialog
    const successDialog = page.getByRole("alertdialog");
    await successDialog.getByRole("button", { name: "Close" }).click();

    // Wait for the key to appear
    await expect(page.locator(`text=${apiKeyName}`)).toBeVisible();

    await page
      .getByRole("button", { name: `Open actions for ${apiKeyName}` })
      .click();
    await page.getByTestId(`delete-api-key-button-${apiKeyName}`).click();

    // Confirm deletion in the dialog
    const deleteDialog = page.getByRole("alertdialog");
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text=${apiKeyName}`)).not.toBeVisible();
  });

  test("should show API key creation with proper messaging", async ({
    page,
  }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.getByRole("button", { name: /create key/i }).click();
    const createDialog = page.getByRole("alertdialog");
    await expect(createDialog).toBeVisible();
    await createDialog
      .locator('input[placeholder*="My Mobile App"]')
      .fill("Test Visibility Key");
    await createDialog.getByRole("button", { name: "Create Key" }).click();

    // Check success dialog messaging
    const successDialog = page.getByRole("alertdialog");
    await expect(
      successDialog.getByText("API Key Created Successfully!"),
    ).toBeVisible();
    await expect(
      successDialog.getByText(
        "Your API key has been created. Copy it now because you will not be able to see it again.",
      ),
    ).toBeVisible();

    // Check that the actual API key is displayed in the dialog
    await expect(
      successDialog.locator('input[class*="font-mono"]'),
    ).toBeVisible();

    // Close the dialog
    await successDialog.getByRole("button", { name: "Close" }).click();

    // Check that the key appears in the list after closing
    await expect(page.locator("text=Test Visibility Key")).toBeVisible();
  });
});
