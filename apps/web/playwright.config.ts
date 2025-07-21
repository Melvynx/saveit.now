import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env" });

const SERVER_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS === "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: SERVER_URL,
    trace: "on-first-retry",
    video: "on-first-retry",
    headless: HEADLESS,
    actionTimeout: 15000,
    navigationTimeout: 15000,
    launchOptions: {
      slowMo: HEADLESS ? 0 : 200,
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    },
    // env: {
    //   ...process.env,
    //   NODE_ENV: "test",
    // },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // storageState: "playwright/.auth/user.json",
      },
    },
  ],
});
