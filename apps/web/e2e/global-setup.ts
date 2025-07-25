import { PrismaClient } from "@workspace/database";
import { writeFile } from "fs/promises";
import { nanoid } from "nanoid";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { testAuth } from "./utils/better-auth-test";
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
    const prisma: PrismaClient = getPrismaClient();

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
          subscriptions: {
            create: {
              stripeCustomerId: "cus_1234567890",
              stripeSubscriptionId: "sub_1234567890",
              id: "xx",
              plan: "pro",
              status: "active",
            },
          },
        },
      });
    }

    const result = await testAuth.api.createApiKey({
      body: {
        userId: testUser.id,
        name: "E2E Test API Key",
      },
    });

    // Store API key for tests to use
    const testConfig = {
      apiKey: result.key,
      userId: testUser.id,
      userEmail: TEST_EMAIL,
    };

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    await writeFile(
      join(__dirname, "test-config.json"),
      JSON.stringify(testConfig, null, 2),
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
