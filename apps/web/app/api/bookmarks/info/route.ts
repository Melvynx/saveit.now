import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const GET = userRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.array(z.string()).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
    }),
  )
  .handler(async (req, { ctx }) => {
    const bookmarksCount = await prisma.bookmark.count({
      where: {
        userId: ctx.user.id,
      },
    });

    return {
      bookmarksCount,
    };
  });
