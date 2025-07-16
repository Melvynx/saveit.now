// Setup authentication for API tests by signing in and saving session state
import { test as setup, expect } from "@playwright/test";
import { signInWithEmail } from "./utils/auth-test";
import { generateTestUserData } from "./utils/test-data";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page, context }) => {
  const testUserData = generateTestUserData();
  
  await signInWithEmail({ 
    email: testUserData.email, 
    page 
  });
  
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/app/);
  await page.waitForLoadState("networkidle");
  
  const isAuthenticated = await page.locator("body").isVisible();
  expect(isAuthenticated).toBeTruthy();
  
  await page.context().storageState({ path: authFile });
  
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