import { test as setup, expect } from "@playwright/test";
import { signInWithEmail } from "./utils/auth-test";
import { generateTestUserData } from "./utils/test-data";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page, context }) => {
  // Generate test user data
  const testUserData = generateTestUserData();
  
  // Sign in through the UI to get session cookies
  await signInWithEmail({ 
    email: testUserData.email, 
    page 
  });
  
  // Wait for authentication to complete
  await page.waitForLoadState("networkidle");
  
  // Verify we're authenticated by checking the URL
  await expect(page).toHaveURL(/\/app/);
  
  // Wait for the page to load completely
  await page.waitForLoadState("networkidle");
  
  // Try to find any content indicating we're authenticated
  const isAuthenticated = await page.locator("body").isVisible();
  expect(isAuthenticated).toBeTruthy();
  
  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });
  
  // Save user data for later use in tests
  await page.context().storageState({ 
    path: authFile.replace('.json', '.user.json'),
    cookies: await context.cookies(),
    origins: [
      {
        origin: page.url(),
        localStorage: [
          {
            name: "test-user-data",
            value: JSON.stringify(testUserData)
          }
        ]
      }
    ]
  });
});