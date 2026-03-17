import { apiRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";

export const GET = apiRoute.handler(async (_, { ctx }) => {
  const userId = ctx.user.id;

  const openedBookmarkIds = await prisma.bookmarkOpen.findMany({
    where: { userId },
    select: { bookmarkId: true },
    distinct: ["bookmarkId"],
  });

  const excludeIds = openedBookmarkIds.map((o) => o.bookmarkId);

  const totalAvailable = await prisma.bookmark.count({
    where: {
      userId,
      status: "READY",
      id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
    },
  });

  if (totalAvailable === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No more bookmarks available. All bookmarks have been opened.",
        totalOpened: excludeIds.length,
      },
      { status: 404 },
    );
  }

  const skip = Math.floor(Math.random() * totalAvailable);

  const bookmark = await prisma.bookmark.findFirst({
    where: {
      userId,
      status: "READY",
      id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
    },
    skip,
    include: {
      tags: { include: { tag: true } },
    },
  });

  if (!bookmark) {
    return NextResponse.json(
      { success: false, error: "No bookmark found" },
      { status: 404 },
    );
  }

  await prisma.bookmarkOpen.create({
    data: {
      bookmarkId: bookmark.id,
      userId,
    },
  });

  return {
    success: true,
    bookmark: {
      id: bookmark.id,
      url: bookmark.url,
      title: bookmark.title,
      summary: bookmark.summary,
      type: bookmark.type,
      status: bookmark.status,
      starred: bookmark.starred,
      read: bookmark.read,
      preview: bookmark.preview,
      faviconUrl: bookmark.faviconUrl,
      ogImageUrl: bookmark.ogImageUrl,
      ogDescription: bookmark.ogDescription,
      createdAt: bookmark.createdAt,
      tags: bookmark.tags.map((bt) => bt.tag.name),
    },
    remaining: totalAvailable - 1,
  };
});
