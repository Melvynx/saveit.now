// Setup authentication for API tests by signing in and saving session state. This creates an authenticated user session that can be reused by all API tests to avoid having to login for each test.
import { expect, Page } from "@playwright/test";
import { signInWithEmail } from "./utils/auth-test";
import { generateTestUserData } from "./utils/test-data";

const authFile = "playwright/.auth/user.json";

const setupAuthentication = async ({ page }: { page: Page }) => {
  const testUserData = generateTestUserData();

  await signInWithEmail({
    email: testUserData.email,
    page,
  });

  await expect(page).toHaveURL(/\/app/);

  const isAuthenticated = await page.locator("body").isVisible();
  expect(isAuthenticated).toBeTruthy();

  await page.context().storageState({ path: authFile });
};

export { setupAuthentication };
