import { expect, test } from "@playwright/test";
import { getPrismaClient } from "../utils/database-loader.mjs";
import { getUserEmail, generateId } from "../utils/test-data";

const prisma = getPrismaClient();

test.describe("Create Bookmark Tests", () => {
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
    await prisma.bookmark.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  test("should create bookmark with valid URL", async () => {
    const bookmarkData = {
      url: "https://example.com/test",
      userId: testUserId,
      status: "READY" as const,
      type: "PAGE" as const,
    };

    const result = await prisma.bookmark.create({
      data: bookmarkData,
    });
    
    expect(result).toBeDefined();
    expect(result.url).toBe(bookmarkData.url);
    expect(result.userId).toBe(testUserId);
    
    const dbBookmark = await prisma.bookmark.findUnique({
      where: { id: result.id },
    });
    expect(dbBookmark).toBeTruthy();
    expect(dbBookmark?.url).toBe(bookmarkData.url);
  });

  test("should clean URL tracking parameters", async () => {
    const cleanUrl = (url: string) => {
      try {
        const urlObj = new URL(url);
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
          'fbclid', 'gclid', 'ref', 'source'
        ];
        
        trackingParams.forEach(param => {
          urlObj.searchParams.delete(param);
        });
        
        return urlObj.toString();
      } catch {
        return url;
      }
    };

    const dirtyUrl = "https://example.com/test?utm_source=test&utm_medium=email&fbclid=123";
    const expectedCleanUrl = "https://example.com/test";
    
    const cleanedUrl = cleanUrl(dirtyUrl);
    expect(cleanedUrl).toBe(expectedCleanUrl);

    const result = await prisma.bookmark.create({
      data: {
        url: cleanedUrl,
        userId: testUserId,
        status: "READY" as const,
        type: "PAGE" as const,
      },
    });
    
    expect(result.url).toBe(expectedCleanUrl);
  });

  test("should handle special characters in URLs", async () => {
    const specialUrl = "https://example.com/test?query=hello%20world&param=value%21";
    
    const bookmark = await prisma.bookmark.create({
      data: {
        url: specialUrl,
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    expect(bookmark).toBeDefined();
    expect(bookmark.url).toBe(specialUrl);
  });

  test("should handle empty title gracefully", async () => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://empty-title-test.com",
        title: null,
        userId: testUserId,
        status: "READY",
        type: "PAGE",
      },
    });

    expect(bookmark).toBeDefined();
    expect(bookmark.title).toBeNull();
    expect(bookmark.url).toBe("https://empty-title-test.com");
  });
});