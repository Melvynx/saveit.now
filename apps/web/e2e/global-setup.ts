import {
  cleanupTestData,
  seedTestBookmarks,
  seedTestTags,
} from "./utils/database";
import { getPrismaClient } from "./utils/database-loader.mjs";
import { TEST_EMAIL, TEST_NAME } from "./utils/test-data";

async function globalSetup() {
  try {
    // Clean up any existing test data
    await cleanupTestData();

    // Create main test user directly in database since email/password signup is not enabled
    const prisma = getPrismaClient();

    // Check if user already exists
    let testUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });

    if (!testUser) {
      // Create user directly in database
      testUser = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          name: TEST_NAME,
          emailVerified: true,
          onboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Seed test data
    await seedTestBookmarks(testUser.id, 5);
    await seedTestTags(testUser.id, 3);
  } catch (error) {
    console.error("E2E test setup failed:", error);
    // Clean up on failure
    await cleanupTestData();
    throw error;
  }
}

export default globalSetup;
