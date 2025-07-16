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
    
    // Check for masked key display
    await expect(page.locator("code")).toBeVisible();
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

    // Click the delete button
    await page.click("button[title='Delete API Key'], button:has(svg)");

    // Confirm deletion in the dialog
    page.on("dialog", dialog => dialog.accept());

    // Wait for success message
    await expect(page.locator("text=API key deleted successfully")).toBeVisible();
    
    // Check that the API key is no longer visible
    await expect(page.locator("text=Test API Key to Delete")).not.toBeVisible();
  });

  test("should show/hide API key", async ({ page }) => {
    await page.goto("/account/keys");
    await page.waitForLoadState("networkidle");

    // Create an API key first
    await page.click("button:has-text('Create API Key')");
    await page.fill("input[name='name']", "Test Visibility Key");
    await page.click("button:has-text('Create Key')");

    // Wait for the key to appear
    await expect(page.locator("text=Test Visibility Key")).toBeVisible();

    // Initially key should be masked
    const keyElement = page.locator("code").first();
    const initialText = await keyElement.textContent();
    expect(initialText).toContain("...");

    // Click the show/hide button
    await page.click("button:has-text('Show'), button:has(svg)");

    // Key should now be visible
    const revealedText = await keyElement.textContent();
    expect(revealedText).not.toContain("...");
    expect(revealedText?.length).toBeGreaterThan(10);

    // Click hide button
    await page.click("button:has-text('Hide'), button:has(svg)");

    // Key should be masked again
    const hiddenText = await keyElement.textContent();
    expect(hiddenText).toContain("...");
  });
});