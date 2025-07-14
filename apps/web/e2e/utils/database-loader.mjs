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

  // First delete bookmarks for test users
  await prisma.bookmark.deleteMany({
    where: {
      user: {
        email: {
          startsWith: testPrefix,
        },
      },
    },
  });

  // Delete tags for test users
  await prisma.tag.deleteMany({
    where: {
      user: {
        email: {
          startsWith: testPrefix,
        },
      },
    },
  });

  // Delete bookmark opens for test users
  await prisma.bookmarkOpen.deleteMany({
    where: {
      user: {
        email: {
          startsWith: testPrefix,
        },
      },
    },
  });

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
