import { Prisma, prisma } from "@workspace/database";

const SELECT_QUERY = {
  id: true,
  userId: true,
  url: true,
  title: true,
  faviconUrl: true,
  summary: true,
  note: true,
  preview: true,
  ogImageUrl: true,
  type: true,
  metadata: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  starred: true,
  read: true,
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
} as const;

export const getUserBookmark = async (bookmarkId: string, userId: string) => {
  return await prisma.bookmark.findUnique({
    where: {
      id: bookmarkId,
      userId: userId,
    },
    select: SELECT_QUERY,
  });
};

export const getPublicBookmark = async (bookmarkId: string) => {
  return await prisma.bookmark.findUnique({
    where: {
      id: bookmarkId,
    },
    select: SELECT_QUERY,
  });
};

export type BookmarkViewType = Prisma.BookmarkGetPayload<{
  select: typeof SELECT_QUERY;
}>;
