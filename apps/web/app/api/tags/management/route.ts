import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";

export const GET = userRoute.handler(async (req, { ctx }) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const tags = await prisma.tag.findMany({
    where: {
      userId: ctx.user.id,
      ...(query && {
        name: {
          contains: query,
          mode: "insensitive",
        },
      }),
      ...(cursor && {
        id: {
          gt: cursor,
        },
      }),
    },
    include: {
      _count: {
        select: {
          bookmarks: true,
        },
      },
    },
    orderBy: {
      bookmarks: {
        _count: "desc",
      },
    },
    take: limit + 1, // Take one extra to check if there are more results
  });

  const hasNextPage = tags.length > limit;
  const results = hasNextPage ? tags.slice(0, limit) : tags;
  const nextCursor = hasNextPage ? results[results.length - 1]?.id : null;

  return NextResponse.json({
    tags: results,
    nextCursor,
    hasNextPage,
  });
});