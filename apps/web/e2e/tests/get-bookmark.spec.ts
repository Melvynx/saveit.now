import { expect, test } from "@playwright/test";
import { generateId } from "better-auth";
import { getPrismaClient } from "../utils/database-loader.mjs";
import { getUserEmail } from "../utils/test-data.js";

const prisma = getPrismaClient();

test.describe("Get Bookmark Tests", () => {
  let testUserId: string;
  let testEmail: string;

  test.beforeAll(async () => {
    testEmail = getUserEmail();
    testUserId = generateId();

    await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        name: "Test User",
        emailVerified: true,
        onboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  test.afterAll(async () => {
    await prisma.bookmarkTag.deleteMany({
      where: { bookmark: { userId: testUserId } },
    });
    await prisma.bookmark.deleteMany({ where: { userId: testUserId } });
    await prisma.tag.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  test("should retrieve user bookmark with correct user", async () => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://get-bookmark-test.com",
        title: "Get Bookmark Test",
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    // Mimic getUserBookmark logic
    const result = await prisma.bookmark.findUnique({
      where: {
        id: bookmark.id,
        userId: testUserId,
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe(bookmark.id);
    expect(result?.url).toBe("https://get-bookmark-test.com");
    expect(result?.userId).toBe(testUserId);
  });

  test("should return null for bookmark with wrong user", async () => {
    const otherUserId = generateId();
    const otherUserEmail = getUserEmail();

    await prisma.user.create({
      data: {
        id: otherUserId,
        email: otherUserEmail,
        name: "Other User",
        emailVerified: true,
        onboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const otherBookmark = await prisma.bookmark.create({
      data: {
        url: "https://other-user-bookmark.com",
        userId: otherUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    // Try to access with wrong user (mimicking getUserBookmark)
    const result = await prisma.bookmark.findUnique({
      where: {
        id: otherBookmark.id,
        userId: testUserId, // Wrong user
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toBeNull();

    // Cleanup
    await prisma.bookmark.delete({ where: { id: otherBookmark.id } });
    await prisma.user.delete({ where: { id: otherUserId } });
  });

  test("should retrieve bookmark with tags", async () => {
    const tag = await prisma.tag.create({
      data: {
        name: "test-tag",
        userId: testUserId,
        type: "USER",
      },
    });

    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://bookmark-with-tags.com",
        title: "Bookmark with Tags",
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    // Associate tag with bookmark
    await prisma.bookmarkTag.create({
      data: {
        bookmarkId: bookmark.id,
        tagId: tag.id,
      },
    });

    // Retrieve with tags (mimicking getUserBookmark)
    const result = await prisma.bookmark.findUnique({
      where: {
        id: bookmark.id,
        userId: testUserId,
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.tags).toHaveLength(1);
    expect(result?.tags[0].tag.name).toBe("test-tag");
  });

  test("should retrieve public bookmark", async () => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://public-bookmark-test.com",
        title: "Public Bookmark Test",
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    // Mimic getPublicBookmark logic
    const result = await prisma.bookmark.findUnique({
      where: {
        id: bookmark.id,
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe(bookmark.id);
    expect(result?.url).toBe("https://public-bookmark-test.com");
  });

  test("should handle multiple bookmarks for same user", async () => {
    const bookmarks = await Promise.all([
      prisma.bookmark.create({
        data: {
          url: "https://multi-test-1.com",
          title: "Multi Test 1",
          userId: testUserId,
          status: "READY",
          type: "PAGE",
        },
      }),
      prisma.bookmark.create({
        data: {
          url: "https://multi-test-2.com",
          title: "Multi Test 2",
          userId: testUserId,
          status: "READY",
          type: "PAGE",
        },
      }),
    ]);

    // Retrieve first bookmark
    const result1 = await prisma.bookmark.findUnique({
      where: {
        id: bookmarks[0].id,
        userId: testUserId,
      },
    });

    // Retrieve second bookmark
    const result2 = await prisma.bookmark.findUnique({
      where: {
        id: bookmarks[1].id,
        userId: testUserId,
      },
    });

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1?.url).toBe("https://multi-test-1.com");
    expect(result2?.url).toBe("https://multi-test-2.com");
  });

  test("should handle bookmark without tags", async () => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://no-tags-bookmark.com",
        title: "No Tags Bookmark",
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    const result = await prisma.bookmark.findUnique({
      where: {
        id: bookmark.id,
        userId: testUserId,
      },
      include: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    expect(result).toBeDefined();
    expect(result?.tags).toHaveLength(0);
  });
});
