import { expect, test } from "@playwright/test";
import { changelogEntries } from "../../src/lib/changelog/changelog-data.js";
import { signInWithEmail } from "../utils/auth-test.js";
import { getUserEmail } from "../utils/test-data.js";

test.describe("Changelog state", () => {
  // Use the same user for dismiss-related tests
  const SHARED_TEST_USER_EMAIL = getUserEmail();

  // Get the latest changelog entry dynamically
  const latestEntry = changelogEntries[0];
  test("new user should not have dismissed the latest changelog", async ({
    page,
  }) => {
    await signInWithEmail({ email: getUserEmail(), page });

    const response = await page.request.post("/api/changelog/check-dismissed", {
      data: { version: latestEntry?.version },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.isDismissed).toBe(false);
  });

  test("user can dismiss latest changelog", async ({ page }) => {
    await signInWithEmail({ email: SHARED_TEST_USER_EMAIL, page });

    const dismissResponse = await page.request.post("/api/changelog/dismiss", {
      data: { version: latestEntry?.version },
    });
    expect(dismissResponse.status()).toBe(200);

    const checkResponse = await page.request.post(
      "/api/changelog/check-dismissed",
      { data: { version: latestEntry?.version } },
    );
    expect(checkResponse.status()).toBe(200);

    const body = await checkResponse.json();
    expect(body.isDismissed).toBe(true);
  });

  test("changelog page shows latest details", async ({ page }) => {
    await page.goto("/changelog");

    await expect(
      page.getByText(latestEntry?.title ?? "", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText(latestEntry?.version ?? "", { exact: false }),
    ).toBeVisible();
  });

  test("/changelog/versions page redirects to /changelog", async ({ page }) => {
    await page.goto("/changelog/versions");

    // Should redirect to /changelog
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/changelog");
  });
});
