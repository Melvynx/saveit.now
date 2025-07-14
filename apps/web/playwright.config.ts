import { defineConfig, devices } from "@playwright/test";

const SERVER_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const HEADLESS = process.env.HEADLESS === "true";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker to avoid database conflicts
  reporter: "html",
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  globalTeardown: require.resolve("./e2e/global-teardown.ts"),
  use: {
    baseURL: SERVER_URL,
    trace: "on-first-retry",
    video: "on-first-retry",
    headless: HEADLESS,
    actionTimeout: 15000,
    navigationTimeout: 15000,
    launchOptions: {
      slowMo: HEADLESS ? 0 : 200,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm build && pnpm start",
    url: SERVER_URL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});