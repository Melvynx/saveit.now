import { apiRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const GET = apiRoute
  .query(
    z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    })
  )
  .handler(async (req, { ctx, query }) => {
    const tags = await prisma.tag.findMany({
      where: {
        userId: ctx.user.id,
        ...(query.cursor && {
          id: {
            gt: query.cursor,
          },
        }),
      },
      orderBy: {
        id: "asc",
      },
      take: query.limit + 1, // Take one extra to check if there are more results
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
    });

    const hasMore = tags.length > query.limit;
    const results = hasMore ? tags.slice(0, query.limit) : tags;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return {
      success: true,
      tags: results.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        bookmarkCount: tag._count.bookmarks,
      })),
      hasMore,
      nextCursor,
    };
  });