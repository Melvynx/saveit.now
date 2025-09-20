import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  getOTPCodeFromDatabase,
  setUserOnboardingTrue,
} from "./database-loader.mjs";
import { TEST_EMAIL, TEST_PASSWORD, generateTestUserData } from "./test-data";

export interface AuthTestUserData {
  name: string;
  email: string;
  password: string;
}

/**
 * Sign in with the main test account created in global setup
 */
export async function signInMainAccount(page: Page, callbackURL?: string) {
  const targetURL = callbackURL
    ? `/signin?callbackUrl=${encodeURIComponent(callbackURL)}`
    : "/signin";

  await page.goto(targetURL);

  // Fill in the email
  await page.fill('input[placeholder="john@doe.com"]', TEST_EMAIL);

  // Click the sign in button
  await page.click('button[type="submit"]:has-text("Sign in")');

  // Wait for OTP step to appear
  await expect(
    page.locator("text=A one-time password has been sent to"),
  ).toBeVisible();

  // For testing purposes, we would need to implement OTP bypass or mock
  // For now, this demonstrates the flow structure
  console.log(`Would send OTP to ${TEST_EMAIL} in real scenario`);

  return { email: TEST_EMAIL, password: TEST_PASSWORD };
}

/**
 * Create a new test account through the UI
 */
export async function createTestAccount(
  page: Page,
  options?: {
    callbackURL?: string;
    userData?: AuthTestUserData;
  },
) {
  const { callbackURL = "/app", userData } = options || {};
  const testUserData = userData || generateTestUserData();

  // Navigate to signup/signin page
  const targetURL = `/signin?callbackUrl=${encodeURIComponent(callbackURL)}`;
  await page.goto(targetURL);

  // Fill in the email
  await page.fill('input[placeholder="john@doe.com"]', testUserData.email);

  // Click the sign in button to start OTP flow
  await page.click('button[type="submit"]:has-text("Sign in")');

  // Wait for OTP step to appear
  await expect(
    page.locator("text=A one-time password has been sent to"),
  ).toBeVisible();

  console.log(`Test account creation flow initiated for ${testUserData.email}`);

  return testUserData;
}

/**
 * Sign out from the current session
 */
export async function signOutAccount(page: Page) {
  // Navigate to a protected page first if not already there
  await page.goto("/app");

  // Look for logout button (this may need adjustment based on actual UI)
  const logoutButton = page
    .locator(
      '[data-testid="logout-button"], button:has-text("Sign out"), button:has-text("Logout")',
    )
    .first();

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // Alternative: look for user menu and then logout
    const userMenu = page
      .locator('[data-testid="user-menu"], [data-testid="avatar"]')
      .first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click(
        'button:has-text("Sign out"), button:has-text("Logout")',
      );
    }
  }

  // Wait for redirect to landing page or signin page
  await page.waitForURL(/\/(signin|$)/);
}

/**
 * Check if user is authenticated by testing access to protected route
 */
export async function verifyAuthState(
  page: Page,
): Promise<"authenticated" | "unauthenticated"> {
  await page.goto("/app");

  // Wait for navigation to complete
  await page.waitForLoadState("networkidle");

  const currentURL = page.url();

  if (currentURL.includes("/signin")) {
    return "unauthenticated";
  }

  if (currentURL.includes("/app")) {
    // Additional check: look for authenticated user elements
    const hasUserContent = await page
      .locator('h1, [data-testid="bookmarks"], main')
      .isVisible();
    return hasUserContent ? "authenticated" : "unauthenticated";
  }

  return "unauthenticated";
}

/**
 * Wait for authentication to complete after OTP submission
 */
export async function waitForAuthSuccess(
  page: Page,
  expectedRedirect = "/app",
) {
  await page.waitForURL(expectedRedirect, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Sign in using OAuth provider (for future implementation)
 */
export async function signInWithOAuth(
  page: Page,
  provider: "github" | "google",
) {
  await page.goto("/signin");

  const oauthButton = page.locator(
    `button:has-text("Continue with ${provider === "github" ? "GitHub" : "Google"}")`,
  );
  await expect(oauthButton).toBeVisible();

  await oauthButton.click();

  // Note: In real tests, you would need to handle OAuth flow
  // This might involve mocking OAuth or using test credentials
  console.log(`OAuth flow initiated for ${provider}`);
}

/**
 * Fill OTP code and verify authentication success
 */
export async function fillOTPCode(page: Page, code: string) {
  console.log(`Filling OTP code: ${code}`);

  // Wait for OTP input to be visible
  await expect(page.locator('input[inputmode="numeric"]').first()).toBeVisible();

  // Use the InputOTP component directly - it's a single input that handles the OTP
  await page.locator('input[inputmode="numeric"]').first().fill(code);

  // The form should auto-submit when all 6 digits are entered
  console.log("OTP filled, waiting for authentication success...");
  await waitForAuthSuccess(page);
}

export async function signInWithEmail(params: { email: string; page: Page }) {
  const { email, page } = params;

  await page.goto("/signin");

  const testEmail = email;
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

  await page.waitForTimeout(1000);
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch (error) {
    // If networkidle times out, just continue - page might be loaded enough
    console.log("Network idle timeout - continuing anyway");
  }

  const currentUrl = page.url();
  if (currentUrl.includes("/start")) {
    await setUserOnboardingTrue(testEmail);
    await page.goto("/app");
  } else if (!currentUrl.includes("/app")) {
    // If not on /app, navigate there
    await page.goto("/app");
  }

  await expect(page).toHaveURL("/app");
}
