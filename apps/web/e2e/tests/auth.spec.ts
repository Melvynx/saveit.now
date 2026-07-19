import { devices, expect, test } from "@playwright/test";
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

    await expect(page).toHaveURL(/\/signin/);
    await page.waitForTimeout(500);

    const signInUrl = new URL(page.url());
    expect(signInUrl.searchParams.get("redirectUrl")).toBe("/app");
    expect(signInUrl.searchParams.get("redirectUrl")).not.toContain("/signin");
  });

  test("signin page loads correctly", async ({ page }) => {
    await page.goto("/signin");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify signin page elements - use more specific selectors
    await expect(
      page.getByRole("heading", { name: /welcome back home/i }),
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

  test("signup intent stays distinct and offers a direct sign-in path", async ({
    page,
  }) => {
    await page.goto("/signin?intent=signup");

    await expect(
      page.getByRole("heading", { name: /give your links a home/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with email/i }),
    ).toBeVisible();
    await expect(page.getByText(/already have an account/i)).toBeVisible();

    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(
      page.getByRole("heading", { name: /welcome back home/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send code to sign in/i }),
    ).toBeVisible();
  });

  test("landing page loads for unauthenticated users", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should not be redirected to signin immediately
    await expect(page).not.toHaveURL(/\/signin/);

    // Should have some way to sign in
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({
      viewport: devices["iPhone 13"].viewport,
      userAgent: devices["iPhone 13"].userAgent,
      deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
      isMobile: devices["iPhone 13"].isMobile,
      hasTouch: devices["iPhone 13"].hasTouch,
    });

    test("landing sign-in target is tappable and opens the email step", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      const signInLink = page.getByRole("link", { name: /^sign in$/i });
      const box = await signInLink.boundingBox();

      expect(
        box,
        "the mobile sign-in link should have a hit target",
      ).not.toBeNull();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      const documentResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());

        return (
          response.request().resourceType() === "document" &&
          url.pathname === "/signin" &&
          url.searchParams.get("intent") === "signin" &&
          url.searchParams.get("step") === "email"
        );
      });

      await signInLink.tap();
      const documentResponse = await documentResponsePromise;

      expect(documentResponse.status()).toBe(200);
      await expect(page).toHaveURL(/\/signin\?intent=signin&step=email$/);
      await expect(
        page.getByRole("heading", { name: /welcome back home/i }),
      ).toBeVisible();
    });
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
