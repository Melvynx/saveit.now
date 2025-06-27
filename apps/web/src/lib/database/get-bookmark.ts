import { Prisma, prisma } from "@workspace/database";

const INCLUDE_QUERY = {
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
};

export const getUserBookmark = async (bookmarkId: string, userId: string) => {
  return await prisma.bookmark.findUnique({
    where: {
      id: bookmarkId,
      userId: userId,
    },
    include: INCLUDE_QUERY,
  });
};

export const getPublicBookmark = async (bookmarkId: string) => {
  return await prisma.bookmark.findUnique({
    where: {
      id: bookmarkId,
    },
    include: INCLUDE_QUERY,
  });
};

export type BookmarkViewType = Prisma.BookmarkGetPayload<{
  include: typeof INCLUDE_QUERY;
}>;
