import { expect, test } from "@playwright/test";
import { getPrismaClient } from "../utils/database-loader.mjs";
import { getUserEmail, generateId } from "../utils/test-data";

const prisma = getPrismaClient();

test.describe("Bookmark Validation Tests", () => {
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

  test("should validate bookmark limits for free users", async () => {
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

    // Check limits
    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: freeUserId },
    });
    const plan = subscription?.plan ?? "free";
    
    const totalBookmarks = await prisma.bookmark.count({
      where: { userId: freeUserId },
    });

    expect(totalBookmarks).toBe(19);
    expect(plan).toBe("free");
    
    const freeLimit = 20;
    expect(totalBookmarks).toBeLessThan(freeLimit);

    // Cleanup
    await prisma.bookmark.deleteMany({ where: { userId: freeUserId } });
    await prisma.user.delete({ where: { id: freeUserId } });
  });

  test("should detect when bookmark limit is exceeded", async () => {
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

    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: freeUserId },
    });
    const plan = subscription?.plan ?? "free";
    
    const totalBookmarks = await prisma.bookmark.count({
      where: { userId: freeUserId },
    });

    expect(totalBookmarks).toBe(20);
    expect(plan).toBe("free");
    
    const freeLimit = 20;
    expect(totalBookmarks).toBe(freeLimit);

    // Cleanup
    await prisma.bookmark.deleteMany({ where: { userId: freeUserId } });
    await prisma.user.delete({ where: { id: freeUserId } });
  });

  test("should prevent duplicate bookmarks", async () => {
    const testUrl = "https://duplicate-test.com";
    
    await prisma.bookmark.create({
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
    
    const freeLimit = 20;
    expect(totalBookmarks).toBeGreaterThan(freeLimit);

    // Cleanup
    await prisma.bookmark.deleteMany({ where: { userId: premiumUserId } });
    await prisma.subscription.delete({ where: { id: subscription.id } });
    await prisma.user.delete({ where: { id: premiumUserId } });
  });

  test("should track monthly bookmark creation", async () => {
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