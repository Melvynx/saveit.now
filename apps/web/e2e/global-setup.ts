import { nanoid } from "nanoid";
import {
  cleanupTestData,
  seedTestBookmarks,
  seedTestTags,
} from "./utils/database";
import { getPrismaClient } from "./utils/database-loader.mjs";
import { TEST_EMAIL, TEST_NAME } from "./utils/test-data";
import { writeFile } from "fs/promises";
import { join } from "path";

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
          id: nanoid(),
          email: TEST_EMAIL,
          name: TEST_NAME,
          emailVerified: true,
          onboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Create API key for testing
    const apiKeyData = {
      id: nanoid(),
      name: "E2E Test API Key",
      key: `saveit_${nanoid(32)}`,
      userId: testUser.id,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Clean up existing test API key
    await prisma.apikey.deleteMany({
      where: { 
        userId: testUser.id,
        name: "E2E Test API Key"
      }
    });

    // Create new test API key
    await prisma.apikey.create({
      data: apiKeyData,
    });

    // Store API key for tests to use
    const testConfig = {
      apiKey: apiKeyData.key,
      userId: testUser.id,
      userEmail: TEST_EMAIL,
    };

    await writeFile(
      join(__dirname, "test-config.json"),
      JSON.stringify(testConfig, null, 2)
    );

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
