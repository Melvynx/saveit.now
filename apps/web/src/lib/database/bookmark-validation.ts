import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getAuthLimits } from "../auth-limits";
import { ApplicationError, BookmarkErrorType } from "../errors";
import { inngest } from "../inngest/client";
import { logger } from "../logger";
import { getPostHogClient } from "../posthog";

export class BookmarkValidationError extends ApplicationError {
  constructor(message: string, type: string) {
    super(message, type);
    this.name = "BookmarkValidationError";
  }
}

export interface BookmarkValidationOptions {
  userId: string;
  url: string;
  skipExistenceCheck?: boolean;
}

export const validateBookmarkLimits = async (
  options: BookmarkValidationOptions,
) => {
  const { userId, url, skipExistenceCheck = false } = options;
  const subscription = await prisma.subscription.findFirst({
    where: {
      referenceId: userId,
    },
  });
  const plan = subscription?.plan ?? "free";
  const limits = getAuthLimits(subscription);
  const posthogClient = getPostHogClient();

  // Check total bookmarks limit
  const totalBookmarks = await prisma.bookmark.count({
    where: {
      userId,
    },
  });

  if (plan === "free" && totalBookmarks >= 19) {
    const { hasLimitEmailBeenSent } = await import("./user-metadata.utils");
    const emailAlreadySent = await hasLimitEmailBeenSent(userId);

    if (!emailAlreadySent) {
      logger.info("Sending limit reached email to user", { userId });
      inngest.send({
        name: "marketing/email-on-limit-reached",
        data: {
          userId,
        },
      });
    } else {
      logger.info("Limit email already sent", { userId });
    }
  }

  if (totalBookmarks >= limits.bookmarks) {
    logger.info("Bookmark limit reached", { userId });
    posthogClient.capture({
      distinctId: userId,
      event: "bookmark_limit_reached",
      properties: {
        bookmarks: totalBookmarks,
        limit: limits.bookmarks,
      },
    });
    throw new BookmarkValidationError(
      "You have reached the maximum number of bookmarks",
      BookmarkErrorType.MAX_BOOKMARKS,
    );
  }

  // Check monthly bookmark runs limit
  const startOfMonth = dayjs().startOf("month");
  const monthlyBookmarkRuns = await prisma.bookmarkProcessingRun.count({
    where: {
      userId,
      startedAt: {
        gte: startOfMonth.toDate(),
      },
    },
  });

  if (monthlyBookmarkRuns >= limits.monthlyBookmarkRuns) {
    logger.info("Monthly bookmark runs limit reached", { userId });
    posthogClient.capture({
      distinctId: userId,
      event: "monthly_bookmark_runs_limit_reached",
      properties: {
        bookmarkRuns: monthlyBookmarkRuns,
        limit: limits.monthlyBookmarkRuns,
      },
    });
    throw new BookmarkValidationError(
      "You have reached the maximum number of bookmark processing runs for this month",
      BookmarkErrorType.MAX_BOOKMARKS,
    );
  }

  // Check if bookmark already exists (optional)
  if (!skipExistenceCheck) {
    const alreadyExists = await prisma.bookmark.findFirst({
      where: {
        url,
        userId,
      },
    });

    if (alreadyExists) {
      logger.info("Bookmark already exists", { userId });
      posthogClient.capture({
        distinctId: userId,
        event: "bookmark_already_exists",
        properties: {
          url,
        },
      });
      throw new BookmarkValidationError(
        "Bookmark already exists",
        BookmarkErrorType.BOOKMARK_ALREADY_EXISTS,
      );
    }
  }

  return {
    totalBookmarks,
    monthlyBookmarkRuns,
    limits,
    plan,
  };
};
