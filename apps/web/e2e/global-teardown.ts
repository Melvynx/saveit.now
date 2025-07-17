import { cleanupTestData } from "./utils/database";
import { getPrismaClient } from './utils/database-loader.mjs';
import { unlink } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

async function globalTeardown() {
  try {
    // Clean up all test data
    await cleanupTestData();

    // Clean up test config file
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      await unlink(join(__dirname, "test-config.json"));
    } catch (error) {
      // File might not exist, ignore error
    }

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