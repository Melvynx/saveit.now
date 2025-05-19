import { prisma } from "@workspace/database";
import { inngest } from "../inngest/client";

export const createBookmark = async (body: { url: string; userId: string }) => {
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
