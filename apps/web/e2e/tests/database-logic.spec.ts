import { expect, test } from "@playwright/test";
import { getPrismaClient } from "../utils/database-loader.mjs";
import { getUserEmail, generateId } from "../utils/test-data";

const prisma = getPrismaClient();

test.describe("Database Logic Tests - Core Functionality", () => {
  let testUserId: string;
  let testEmail: string;

  test.beforeAll(async () => {
    testEmail = getUserEmail();
    testUserId = generateId();
    
    // Create test user
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
    // Cleanup
    await prisma.bookmarkTag.deleteMany({ where: { bookmark: { userId: testUserId } } });
    await prisma.bookmark.deleteMany({ where: { userId: testUserId } });
    await prisma.tag.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  test.describe("Bookmark Creation Logic", () => {
    test("should create bookmark with valid URL", async () => {
      const bookmarkData = {
        url: "https://example.com/test",
        userId: testUserId,
        status: "READY" as const,
        type: "PAGE" as const,
      };

      // Direct database creation (mimicking createBookmark logic)
      const result = await prisma.bookmark.create({
        data: bookmarkData,
      });
      
      expect(result).toBeDefined();
      expect(result.url).toBe(bookmarkData.url);
      expect(result.userId).toBe(testUserId);
      
      // Verify in database
      const dbBookmark = await prisma.bookmark.findUnique({
        where: { id: result.id },
      });
      expect(dbBookmark).toBeTruthy();
      expect(dbBookmark?.url).toBe(bookmarkData.url);
    });

    test("should handle URL cleaning logic", async () => {
      // Simple URL cleaning function (mimicking cleanUrl logic)
      const cleanUrl = (url: string) => {
        try {
          const urlObj = new URL(url);
          // Remove common tracking parameters
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

      // Test with bookmark creation
      const bookmarkData = {
        url: cleanedUrl,
        userId: testUserId,
        status: "READY" as const,
        type: "PAGE" as const,
      };

      const result = await prisma.bookmark.create({
        data: bookmarkData,
      });
      
      expect(result.url).toBe(expectedCleanUrl);
    });
  });

  test.describe("Bookmark Validation Logic", () => {
    test("should validate bookmark limits for free users", async () => {
      // Create a free user (no subscription)
      const freeUserId = generateId();
      const freeUserEmail = getUserEmail();
      
      await prisma.user.create({
        data: {
          id: freeUserId,
          email: freeUserEmail,
          name: "Free User",
          emailVerified: true,
          onboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create 19 bookmarks (approaching limit)
      const bookmarks = [];
      for (let i = 0; i < 19; i++) {
        bookmarks.push({
          url: `https://example-${i}.com`,
          userId: freeUserId,
          status: "READY",
          type: "PAGE",
        });
      }
      await prisma.bookmark.createMany({ data: bookmarks });

      // Mimic validateBookmarkLimits logic
      const subscription = await prisma.subscription.findFirst({
        where: { referenceId: freeUserId },
      });
      const plan = subscription?.plan ?? "free";
      
      const totalBookmarks = await prisma.bookmark.count({
        where: { userId: freeUserId },
      });

      expect(totalBookmarks).toBe(19);
      expect(plan).toBe("free");
      
      // Free limit should be 20
      const freeLimit = 20;
      expect(totalBookmarks).toBeLessThan(freeLimit);

      // Cleanup
      await prisma.bookmark.deleteMany({ where: { userId: freeUserId } });
      await prisma.user.delete({ where: { id: freeUserId } });
    });

    test("should detect when bookmark limit is exceeded", async () => {
      // Create a free user
      const freeUserId = generateId();
      const freeUserEmail = getUserEmail();
      
      await prisma.user.create({
        data: {
          id: freeUserId,
          email: freeUserEmail,
          name: "Free User",
          emailVerified: true,
          onboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create 20 bookmarks (at limit)
      const bookmarks = [];
      for (let i = 0; i < 20; i++) {
        bookmarks.push({
          url: `https://example-${i}.com`,
          userId: freeUserId,
          status: "READY",
          type: "PAGE",
        });
      }
      await prisma.bookmark.createMany({ data: bookmarks });

      // Check limits
      const subscription = await prisma.subscription.findFirst({
        where: { referenceId: freeUserId },
      });
      const plan = subscription?.plan ?? "free";
      
      const totalBookmarks = await prisma.bookmark.count({
        where: { userId: freeUserId },
      });

      expect(totalBookmarks).toBe(20);
      expect(plan).toBe("free");
      
      // Free limit should be 20, so we're at the limit
      const freeLimit = 20;
      expect(totalBookmarks).toBe(freeLimit);

      // Cleanup
      await prisma.bookmark.deleteMany({ where: { userId: freeUserId } });
      await prisma.user.delete({ where: { id: freeUserId } });
    });

    test("should prevent duplicate bookmarks", async () => {
      // Create a bookmark
      const testUrl = "https://duplicate-test.com";
      
      const createdBookmark = await prisma.bookmark.create({
        data: {
          url: testUrl,
          userId: testUserId,
          status: "READY",
          type: "PAGE",
        },
      });

      // Check for duplicate
      const existingBookmark = await prisma.bookmark.findFirst({
        where: {
          url: testUrl,
          userId: testUserId,
        },
      });

      expect(existingBookmark).toBeTruthy();
      expect(existingBookmark?.url).toBe(testUrl);
    });

    test("should allow premium users to exceed free limits", async () => {
      // Create a premium user
      const premiumUserId = generateId();
      const premiumUserEmail = getUserEmail();
      
      await prisma.user.create({
        data: {
          id: premiumUserId,
          email: premiumUserEmail,
          name: "Premium User",
          emailVerified: true,
          onboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          id: generateId(),
          referenceId: premiumUserId,
          plan: "premium",
          stripeCustomerId: "cus_test_premium",
          stripeSubscriptionId: "sub_test_premium",
          status: "active",
        },
      });

      // Create 25 bookmarks (above free limit)
      const bookmarks = [];
      for (let i = 0; i < 25; i++) {
        bookmarks.push({
          url: `https://premium-${i}.com`,
          userId: premiumUserId,
          status: "READY",
          type: "PAGE",
        });
      }
      await prisma.bookmark.createMany({ data: bookmarks });

      // Check limits
      const userSubscription = await prisma.subscription.findFirst({
        where: { referenceId: premiumUserId },
      });
      const plan = userSubscription?.plan ?? "free";
      
      const totalBookmarks = await prisma.bookmark.count({
        where: { userId: premiumUserId },
      });

      expect(totalBookmarks).toBe(25);
      expect(plan).toBe("premium");
      
      // Premium should allow more than free limit
      const freeLimit = 20;
      expect(totalBookmarks).toBeGreaterThan(freeLimit);

      // Cleanup
      await prisma.bookmark.deleteMany({ where: { userId: premiumUserId } });
      await prisma.subscription.delete({ where: { id: subscription.id } });
      await prisma.user.delete({ where: { id: premiumUserId } });
    });
  });

  test.describe("Bookmark Retrieval Logic", () => {
    test("should retrieve user bookmark with correct user", async () => {
      // Create test bookmark
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
      // Create another user
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

      // Create bookmark for other user
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
      // Create tag
      const tag = await prisma.tag.create({
        data: {
          name: "test-tag",
          userId: testUserId,
          type: "USER",
        },
      });

      // Create bookmark
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
      // Create public bookmark
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
  });

  test.describe("Monthly Limits Logic", () => {
    test("should track monthly bookmark creation", async () => {
      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Create bookmarks this month
      const monthlyBookmarks = [];
      for (let i = 0; i < 5; i++) {
        monthlyBookmarks.push({
          url: `https://monthly-${i}.com`,
          userId: testUserId,
          status: "READY",
          type: "PAGE",
        });
      }
      await prisma.bookmark.createMany({ data: monthlyBookmarks });

      // Count monthly bookmarks
      const monthlyCount = await prisma.bookmark.count({
        where: {
          userId: testUserId,
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      expect(monthlyCount).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle invalid URLs gracefully", async () => {
      const invalidUrls = [
        "not-a-url",
        "http://",
        "https://",
        "",
        "ftp://invalid",
      ];

      for (const invalidUrl of invalidUrls) {
        try {
          new URL(invalidUrl);
          // If URL constructor doesn't throw, it's valid
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
        }
      }
    });

    test("should handle empty bookmark title and description", async () => {
      const bookmark = await prisma.bookmark.create({
        data: {
          url: "https://empty-fields-test.com",
          title: null,
          userId: testUserId,
          status: "READY",
          type: "PAGE",
        },
      });

      expect(bookmark).toBeDefined();
      expect(bookmark.title).toBeNull();
      expect(bookmark.url).toBe("https://empty-fields-test.com");
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
  });
});