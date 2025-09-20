import { expect, test } from "@playwright/test";
import { getUserEmail } from "e2e/utils/test-data";
import { getOTPCodeFromDatabase } from "../utils/otp-helper";

test.describe("Authentication Flow - Simple Tests", () => {
  test("unauthenticated user visiting /app should redirect to /signin", async ({
    page,
  }) => {
    // Navigate directly to the protected /app route
    await page.goto("/app");

    // Wait for navigation to complete
    await page.waitForLoadState("networkidle");

    // Should either be on signin page or see signin-related content
    expect(page.url()).toContain("/signin");
  });

  test("signin page loads correctly", async ({ page }) => {
    await page.goto("/signin");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify signin page elements - use more specific selectors
    await expect(
      page.locator('div[data-slot="card-title"]:has-text("Sign in")'),
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="john@doe.com"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[type="submit"]:has-text("Sign in")'),
    ).toBeVisible();

    // Verify OAuth options are present
    await expect(
      page.locator('button:has-text("Continue with GitHub")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Continue with Google")'),
    ).toBeVisible();
  });

  test("landing page loads for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    const currentURL = page.url();

    // Should not be redirected to signin immediately
    expect(currentURL).not.toMatch(/\/signin/);

    // Should have some way to sign in - try multiple selector patterns

    await page
      .locator('button:has-text("Sign in")')
      .isVisible({ timeout: 5000 });
  });

  test("email form progresses to OTP step", async ({ page }) => {
    await page.goto("/signin");

    const testEmail = getUserEmail();

    // Fill in a test email
    await page.fill('input[placeholder="john@doe.com"]', testEmail);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should progress to OTP step
    await expect(
      page.locator("text=A one-time password has been sent to"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    // Verify OTP input elements exist
    const otpInputs = page.locator("input[inputmode='numeric']");
    await expect(otpInputs.first()).toBeVisible();

    const otpCode = await getOTPCodeFromDatabase(`sign-in-otp-${testEmail}`);

    if (!otpCode) {
      throw new Error("OTP code not found");
    }

    await page.getByRole("textbox").fill(otpCode);

    await expect(page).toHaveURL("/start");
  });
});
