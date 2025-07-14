import { prisma } from "@workspace/database";

export async function cleanupTestData() {
  // Clean up test data by prefix to avoid affecting real data
  const testPrefix = "playwright-test-";

  // Delete test bookmarks for test users
  await prisma.bookmark.deleteMany({
    where: {
      user: {
        email: {
          startsWith: testPrefix,
        },
      },
    },
  });

  // Delete test users and related data (cascade will handle sessions, accounts, etc.)
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: testPrefix,
      },
    },
  });

  console.log("Test data cleanup completed");
}

export async function createTestUser(email: string, name: string, password: string) {
  // Note: We'll create the user through Better Auth in global-setup
  // This is just a utility to check if user exists
  return prisma.user.findUnique({
    where: { email },
    include: {
      bookmarks: true,
    },
  });
}

export async function seedTestBookmarks(userId: string, count = 5) {
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

export async function seedTestTags(userId: string, count = 3) {
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

export { prisma };