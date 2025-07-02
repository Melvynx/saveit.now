import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getUserLimits } from "../auth-session";
import { ApplicationError, BookmarkErrorType } from "../errors";
import { inngest } from "../inngest/client";
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
  options: BookmarkValidationOptions
) => {
  const { userId, url, skipExistenceCheck = false } = options;
  const user = await getUserLimits();
  const posthogClient = getPostHogClient();

  // Check total bookmarks limit
  const totalBookmarks = await prisma.bookmark.count({
    where: {
      userId,
    },
  });

  if (user.plan === "free" && totalBookmarks >= 19) {
    inngest.send({
      name: "marketing/email-on-limit-reached",
      data: {
        userId,
      },
    });
  }

  if (totalBookmarks >= user.limits.bookmarks) {
    posthogClient.capture({
      distinctId: userId,
      event: "bookmark_limit_reached",
      properties: {
        bookmarks: totalBookmarks,
        limit: user.limits.bookmarks,
      },
    });
    throw new BookmarkValidationError(
      "You have reached the maximum number of bookmarks",
      BookmarkErrorType.MAX_BOOKMARKS
    );
  }

  // Check monthly bookmarks limit
  const startOfMonth = dayjs().startOf("month");
  const monthlyBookmarks = await prisma.bookmark.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth.toDate(),
      },
    },
  });

  if (monthlyBookmarks >= user.limits.monthlyBookmarks) {
    posthogClient.capture({
      distinctId: userId,
      event: "monthly_bookmark_limit_reached",
      properties: {
        bookmarks: monthlyBookmarks,
        limit: user.limits.monthlyBookmarks,
      },
    });
    throw new BookmarkValidationError(
      "You have reached the maximum number of bookmarks for this month",
      BookmarkErrorType.MAX_BOOKMARKS
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
      posthogClient.capture({
        distinctId: userId,
        event: "bookmark_already_exists",
        properties: {
          url,
        },
      });
      throw new BookmarkValidationError(
        "Bookmark already exists",
        BookmarkErrorType.BOOKMARK_ALREADY_EXISTS
      );
    }
  }

  return {
    totalBookmarks,
    monthlyBookmarks,
    limits: user.limits,
  };
};