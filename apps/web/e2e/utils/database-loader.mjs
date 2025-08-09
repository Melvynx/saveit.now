/**
 * ES Module loader for Prisma client in Playwright tests
 * This file loads the Prisma client using dynamic imports in an ES module context
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the Prisma client from the generated location
const prismaPath = path.resolve(
  __dirname,
  "../../../../packages/database/generated/prisma",
);
const { PrismaClient } = require(prismaPath);

// Create a global instance of Prisma client
const globalForPrisma = global;

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export all database utilities
export async function getOTPCodeFromDatabase(email) {
  const prisma = getPrismaClient();

  const verification = await prisma.verification.findFirst({
    where: {
      identifier: email,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verification) {
    throw new Error(`No verification record found for email: ${email}`);
  }

  // The value format is "123456:0" - we need the first part (the OTP code)
  const otpCode = verification.value.split(":")[0];

  if (!otpCode || otpCode.length !== 6) {
    throw new Error(`Invalid OTP format in database: ${verification.value}`);
  }

  return otpCode;
}

export async function cleanupVerificationRecords() {
  const prisma = getPrismaClient();

  await prisma.verification.deleteMany({
    where: {
      identifier: {
        contains: "@playwright.dev",
      },
    },
  });
}

export async function cleanupTestData() {
  const prisma = getPrismaClient();

  // Clean up test data by prefix to avoid affecting real data
  const testPrefix = "playwright-test-";

  // Delete in correct order to avoid foreign key constraints
  // First, find all test user IDs
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: testPrefix,
      },
    },
    select: { id: true },
  });

  const testUserIds = testUsers.map((user) => user.id);

  if (testUserIds.length > 0) {
    // Delete BookmarkTag relations first (through bookmarks)
    await prisma.bookmarkTag.deleteMany({
      where: {
        bookmark: {
          userId: {
            in: testUserIds,
          },
        },
      },
    });

    // Delete BookmarkChunk relations (through bookmarks)
    await prisma.bookmarkChunk.deleteMany({
      where: {
        bookmark: {
          userId: {
            in: testUserIds,
          },
        },
      },
    });

    // Delete bookmarks for test users
    await prisma.bookmark.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Delete tags for test users
    await prisma.tag.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Delete bookmark opens for test users
    await prisma.bookmarkOpen.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Delete API keys for test users
    await prisma.apikey.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });

    // Delete subscriptions for test users
    await prisma.subscription.deleteMany({
      where: {
        referenceId: {
          in: testUserIds,
        },
      },
    });

    // Delete BookmarkProcessingRun for test users
    await prisma.bookmarkProcessingRun.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });
  }

  // Then delete test users (cascade will handle sessions, accounts, etc.)
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: testPrefix,
      },
    },
  });

  // Clean up verification records for playwright.dev emails
  await prisma.verification.deleteMany({
    where: {
      identifier: {
        contains: "@playwright.dev",
      },
    },
  });

  // Clean up Redis data for test users if Redis is available
  try {
    const { Redis } = require("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Clean up changelog dismissal data for test users
    for (const userId of testUserIds) {
      const keys = await redis.keys(`user:${userId}:dismissed_changelog:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.log(
      "Redis cleanup skipped (not available in test environment):",
      error.message,
    );
  }

  // Test data cleanup completed
}

export async function createTestUser(email, name, password) {
  const prisma = getPrismaClient();

  return prisma.user.findUnique({
    where: { email },
    include: {
      bookmarks: true,
    },
  });
}

export async function seedTestBookmarks(userId, count = 5) {
  const prisma = getPrismaClient();
  const bookmarks = [];

  for (let i = 0; i < count; i++) {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: `https://example-${i}.com`,
        title: `Test Bookmark ${i + 1}`,
        ogDescription: `Test description for bookmark ${i + 1}`,
        faviconUrl: `https://example-${i}.com/favicon.ico`,
        userId: userId,
        type: "PAGE",
        status: "READY",
        metadata: {},
      },
    });
    bookmarks.push(bookmark);
  }

  return bookmarks;
}

export async function seedTestTags(userId, count = 3) {
  const prisma = getPrismaClient();
  const tags = [];

  for (let i = 0; i < count; i++) {
    const tag = await prisma.tag.create({
      data: {
        name: `test-tag-${i + 1}`,
        userId: userId,
      },
    });
    tags.push(tag);
  }

  return tags;
}

// Export prisma as a convenient getter
export const prisma = getPrismaClient();

export async function setUserOnboardingTrue(testEmail) {
  const prisma = getPrismaClient();
  await prisma.user.update({
    where: { email: testEmail },
    data: { onboarding: true },
  });
}

export const deleteApiKey = async (userId) => {
  const prisma = getPrismaClient();
  await prisma.apikey.deleteMany({
    where: {
      userId: userId,
    },
  });
};
