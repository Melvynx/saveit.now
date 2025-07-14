// Import from the ES module loader for Playwright compatibility
import { 
  cleanupTestData as cleanup,
  createTestUser as createUser,
  seedTestBookmarks as seedBookmarks,
  seedTestTags as seedTags,
  prisma as prismaClient
} from './database-loader.mjs';

export async function cleanupTestData() {
  return cleanup();
}

export async function createTestUser(email: string, name: string, password: string) {
  return createUser(email, name, password);
}

export async function seedTestBookmarks(userId: string, count = 5) {
  return seedBookmarks(userId, count);
}

export async function seedTestTags(userId: string, count = 3) {
  return seedTags(userId, count);
}

// Export prisma instance for compatibility
export const prisma = prismaClient;