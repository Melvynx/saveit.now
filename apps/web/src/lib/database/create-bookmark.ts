import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getUserLimits } from "../auth-session";
import { ApplicationError, BookmarkErrorType } from "../errors";
import { inngest } from "../inngest/client";

export class BookmarkCreationError extends ApplicationError {
  constructor(message: string, type: string) {
    super(message, type);
    this.name = "BookmarkCreationError";
  }
}

export const createBookmark = async (body: { url: string; userId: string }) => {
  const user = await getUserLimits();
  const totalBookmarks = await prisma.bookmark.count({
    where: {
      userId: body.userId,
    },
  });

  if (totalBookmarks >= user.limits.bookmarks) {
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

  return bookmark;
};
