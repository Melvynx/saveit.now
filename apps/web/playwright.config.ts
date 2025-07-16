import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load environment variables from .env file in apps/web folder for Turborepo
config({ path: ".env" });

const SERVER_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
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
    },
  },

  projects: [
    // Setup project for authentication
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Main test project
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        // Use the auth state from setup
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Note: Start your development server manually with `pnpm dev`
  // webServer configuration removed to avoid conflicts
});
