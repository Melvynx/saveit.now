import { cleanupTestData } from "./utils/database";
import { getPrismaClient } from './utils/database-loader.mjs';

async function globalTeardown() {
  try {
    // Clean up all test data
    await cleanupTestData();

    // Close database connections
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  } catch (error) {
    console.error("E2E test teardown failed:", error);
    // Always try to disconnect from database
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Failed to disconnect from database:", disconnectError);
    }
    throw error;
  }
}

export default globalTeardown;