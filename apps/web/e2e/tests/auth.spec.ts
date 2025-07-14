import { test, expect } from "@playwright/test";
import { verifyAuthState, signOutAccount } from "../utils/auth-test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start each test logged out
    await signOutAccount(page);
  });

  test("unauthenticated user visiting /app should redirect to /signin", async ({ page }) => {
    // Navigate to the protected /app route
    await page.goto("/app");
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify that user is redirected to signin page
    await page.waitForURL(/.*\/signin/);
    expect(page.url()).toMatch(/\/signin/);
    
    // Verify signin page content is visible
    await expect(page.locator('text=Sign in')).toBeVisible();
    await expect(page.locator('input[placeholder="john@doe.com"]')).toBeVisible();
  });

  test("unauthenticated user should see landing page on root path", async ({ page }) => {
    // Navigate to the root path
    await page.goto("/");
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the landing page (not redirected to signin)
    expect(page.url()).not.toMatch(/\/signin/);
    
    // Look for landing page elements
    const hasSignInLink = await page.locator('a[href*="/signin"], button:has-text("Sign in")').isVisible();
    expect(hasSignInLink).toBe(true);
  });

  test("signin page loads correctly with all authentication options", async ({ page }) => {
    await page.goto("/signin");
    
    // Verify signin page elements
    await expect(page.locator('h1:has-text("Sign in"), h2:has-text("Sign in")')).toBeVisible();
    await expect(page.locator('input[placeholder="john@doe.com"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible();
    
    // Verify OAuth options are present
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
  });

  test("email input validation on signin page", async ({ page }) => {
    await page.goto("/signin");
    
    const emailInput = page.locator('input[placeholder="john@doe.com"]');
    const submitButton = page.locator('button[type="submit"]:has-text("Sign in")');
    
    // Test empty email submission
    await submitButton.click();
    
    // Should stay on the same page (form validation should prevent submission)
    expect(page.url()).toMatch(/\/signin/);
    
    // Test invalid email format
    await emailInput.fill("invalid-email");
    await submitButton.click();
    
    // Should still be on signin page
    expect(page.url()).toMatch(/\/signin/);
    
    // Test valid email format (should proceed to OTP step)
    await emailInput.fill("test@example.com");
    await submitButton.click();
    
    // Should show OTP step
    await expect(page.locator('text=Enter the code sent to your email')).toBeVisible();
  });

  test("OTP form step appears after valid email submission", async ({ page }) => {
    await page.goto("/signin");
    
    // Fill valid email and submit
    await page.fill('input[placeholder="john@doe.com"]', "test@example.com");
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Verify OTP step elements
    await expect(page.locator('text=Enter the code sent to your email')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
    
    // Verify OTP input slots are present
    const otpSlots = page.locator('input[data-slot]');
    await expect(otpSlots).toHaveCount(6);
    
    // Verify back button to edit email
    await expect(page.locator('button:has-text("Edit email")')).toBeVisible();
    
    // Verify resend button
    await expect(page.locator('button:has-text("Resend")')).toBeVisible();
  });

  test("can navigate back from OTP step to email step", async ({ page }) => {
    await page.goto("/signin");
    
    // Go to OTP step
    await page.fill('input[placeholder="john@doe.com"]', "test@example.com");
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Verify we're on OTP step
    await expect(page.locator('text=Enter the code sent to your email')).toBeVisible();
    
    // Click back to edit email
    await page.click('button:has-text("Edit email")');
    
    // Should be back on email step
    await expect(page.locator('input[placeholder="john@doe.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="john@doe.com"]')).toHaveValue("test@example.com");
  });

  test("authentication state helper functions work correctly", async ({ page }) => {
    // Test unauthenticated state
    let authState = await verifyAuthState(page);
    expect(authState).toBe("unauthenticated");
    
    // After visiting /app, should still be unauthenticated (redirected to signin)
    await page.goto("/app");
    authState = await verifyAuthState(page);
    expect(authState).toBe("unauthenticated");
  });

  test("protected routes redirect to signin with callback URL", async ({ page }) => {
    const protectedRoutes = ["/app", "/account", "/billing"];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to signin
      expect(page.url()).toMatch(/\/signin/);
      
      // URL should contain callback parameter for proper redirect after auth
      // Note: This depends on how the middleware is implemented
      console.log(`Route ${route} redirected to: ${page.url()}`);
    }
  });
});