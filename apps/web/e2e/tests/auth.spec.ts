import { expect, test } from "@playwright/test";
import { getOTPCodeFromDatabase } from "../utils/otp-helper";
import { getUserEmail } from "../utils/test-data";

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
      page.getByRole("heading", { name: /sign in to saveit\.now/i }),
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="you@example.com"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send code/i }),
    ).toBeVisible();

    // Verify OAuth options are present
    await expect(
      page.getByRole("button", { name: /sign in with github/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });

  test("landing page loads for unauthenticated users", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should not be redirected to signin immediately
    await expect(page).not.toHaveURL(/\/signin/);

    // Should have some way to sign in
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("email form progresses to OTP step", async ({ page }) => {
    await page.goto("/signin");

    const testEmail = getUserEmail();

    // Fill in a test email
    await page.locator('input[placeholder="you@example.com"]').fill(testEmail);

    // Submit the form
    await page.getByRole("button", { name: /send code/i }).click();

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

    await page.locator('input[inputmode="numeric"]').first().fill(otpCode);

    await expect(page).toHaveURL(/\/(app|start)$/);
  });
});
