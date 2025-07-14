import { authClient } from "../src/lib/auth-client";
import { cleanupTestData, seedTestBookmarks, seedTestTags, prisma } from "./utils/database";
import { TEST_EMAIL, TEST_PASSWORD, TEST_NAME } from "./utils/test-data";

async function globalSetup() {
  console.log("Starting E2E test setup...");

  try {
    // First, clean up any existing test data
    await cleanupTestData();

    // Create main test user using Better Auth
    console.log("Creating main test user...");
    const signUpResult = await authClient.signUp.email({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    });

    if (signUpResult.error) {
      throw new Error(`Failed to create test user: ${signUpResult.error.message}`);
    }

    console.log(`Created test user: ${TEST_EMAIL}`);

    // Get the created user from database
    const testUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!testUser) {
      throw new Error("Test user not found after creation");
    }

    // Seed test data
    console.log("Seeding test bookmarks...");
    await seedTestBookmarks(testUser.id, 5);

    console.log("Seeding test tags...");
    await seedTestTags(testUser.id, 3);

    console.log("E2E test setup completed successfully!");
  } catch (error) {
    console.error("E2E test setup failed:", error);
    // Clean up on failure
    await cleanupTestData();
    throw error;
  }
}

export default globalSetup;