import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getAuthLimits } from "../auth-limits";

export type UserLimitsCheckResult = {
  isOverLimit: boolean;
  reason: string | null;
  totalBookmarks: number;
  monthlyBookmarkRuns: number;
  limits: {
    bookmarks: number;
    monthlyBookmarkRuns: number;
  };
  plan: string;
};

export const isUserOverLimits = async (
  userId: string,
): Promise<UserLimitsCheckResult> => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: userId,
    },
  });

  const plan = subscription?.plan ?? "free";
  const limits = getAuthLimits(subscription);

  const totalBookmarks = await prisma.bookmark.count({
    where: { userId },
  });

  const startOfMonth = dayjs().startOf("month");
  const monthlyBookmarkRuns = await prisma.bookmarkProcessingRun.count({
    where: {
      userId,
      startedAt: {
        gte: startOfMonth.toDate(),
      },
    },
  });

  if (totalBookmarks >= limits.bookmarks) {
    return {
      isOverLimit: true,
      reason: `Total bookmarks (${totalBookmarks}) exceeds plan limit (${limits.bookmarks})`,
      totalBookmarks,
      monthlyBookmarkRuns,
      limits: {
        bookmarks: limits.bookmarks,
        monthlyBookmarkRuns: limits.monthlyBookmarkRuns,
      },
      plan,
    };
  }

  if (monthlyBookmarkRuns >= limits.monthlyBookmarkRuns) {
    return {
      isOverLimit: true,
      reason: `Monthly processing runs (${monthlyBookmarkRuns}) exceeds plan limit (${limits.monthlyBookmarkRuns})`,
      totalBookmarks,
      monthlyBookmarkRuns,
      limits: {
        bookmarks: limits.bookmarks,
        monthlyBookmarkRuns: limits.monthlyBookmarkRuns,
      },
      plan,
    };
  }

  return {
    isOverLimit: false,
    reason: null,
    totalBookmarks,
    monthlyBookmarkRuns,
    limits: {
      bookmarks: limits.bookmarks,
      monthlyBookmarkRuns: limits.monthlyBookmarkRuns,
    },
    plan,
  };
};
