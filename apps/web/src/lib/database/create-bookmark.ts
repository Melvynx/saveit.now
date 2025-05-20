import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import { getUserLimits } from "../auth-session";
import { inngest } from "../inngest/client";

export const createBookmark = async (body: { url: string; userId: string }) => {
  const user = await getUserLimits();
  const totalBookmarks = await prisma.bookmark.count({
    where: {
      userId: body.userId,
    },
  });

  if (totalBookmarks >= user.limits.bookmarks) {
    throw new Error("You have reached the maximum number of bookmarks");
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
    throw new Error(
      "You have reached the maximum number of bookmarks for this month"
    );
  }

  const alreadyExists = await prisma.bookmark.findFirst({
    where: {
      url: body.url,
      userId: body.userId,
    },
  });

  if (alreadyExists) {
    throw new Error("Bookmark already exists");
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
    },
  });

  return bookmark;
};
