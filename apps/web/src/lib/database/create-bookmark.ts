import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getUserLimits } from "../auth-session";
import { ApplicationError, BookmarkErrorType } from "../errors";
import { inngest } from "../inngest/client";
import { getPostHogClient } from "../posthog";

export class BookmarkCreationError extends ApplicationError {
  constructor(message: string, type: string) {
    super(message, type);
    this.name = "BookmarkCreationError";
  }
}

export const createBookmark = async (body: { url: string; userId: string }) => {
  const user = await getUserLimits();
  const posthogClient = getPostHogClient();
  const totalBookmarks = await prisma.bookmark.count({
    where: {
      userId: body.userId,
    },
  });

  if (user.plan === "free" && totalBookmarks >= 19) {
    inngest.send({
      name: "marketing/email-on-limit-reached",
      data: {
        userId: body.userId,
      },
    });
  }

  if (totalBookmarks >= user.limits.bookmarks) {
    posthogClient.capture({
      distinctId: body.userId,
      event: "bookmark_limit_reached",
      properties: {
        bookmarks: totalBookmarks,
        limit: user.limits.bookmarks,
      },
    });
    throw new BookmarkCreationError(
      "You have reached the maximum number of bookmarks",
      BookmarkErrorType.MAX_BOOKMARKS,
    );
  }

  const startOfMonth = dayjs().startOf("month");

  const monthlyBookmarks = await prisma.bookmark.count({
    where: {
      userId: body.userId,
      createdAt: {
        gte: startOfMonth.toDate(),
      },
    },
  });

  if (monthlyBookmarks >= user.limits.monthlyBookmarks) {
    posthogClient.capture({
      distinctId: body.userId,
      event: "monthly_bookmark_limit_reached",
      properties: {
        bookmarks: monthlyBookmarks,
        limit: user.limits.monthlyBookmarks,
      },
    });
    throw new BookmarkCreationError(
      "You have reached the maximum number of bookmarks for this month",
      BookmarkErrorType.MAX_BOOKMARKS,
    );
  }

  const alreadyExists = await prisma.bookmark.findFirst({
    where: {
      url: body.url,
      userId: body.userId,
    },
  });

  if (alreadyExists) {
    posthogClient.capture({
      distinctId: body.userId,
      event: "bookmark_already_exists",
      properties: {
        url: body.url,
      },
    });
    throw new BookmarkCreationError(
      "Bookmark already exists",
      BookmarkErrorType.BOOKMARK_ALREADY_EXISTS,
    );
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      url: body.url,
      userId: body.userId,
    },
  });

  await inngest.send({
    name: "bookmark/process",
    data: {
      bookmarkId: bookmark.id,
      userId: body.userId,
    },
  });

  posthogClient.capture({
    distinctId: body.userId,
    event: "bookmark+created",
    properties: {
      url: body.url,
    },
  });

  return bookmark;
};
