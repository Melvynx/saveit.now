import { inngest } from "@/lib/inngest/client";
import { userRoute } from "@/lib/safe-route";
import { advancedSearch } from "@/lib/search/advanced-search";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const POST = userRoute
  .body(z.object({ url: z.string().url() }))
  .handler(async (req, { body, ctx }) => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: body.url,
        userId: ctx.user.id,
      },
    });

    await inngest.send({
      name: "bookmark/process",
      data: {
        bookmarkId: bookmark.id,
      },
    });

    return { status: "ok", bookmark };
  });

export const GET = userRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.array(z.string()).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
    })
  )
  .handler(async (req, { ctx, query }) => {
    const searchResults = await advancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags: query.tags || [],
      limit: query.limit || 20,
      cursor: query.cursor,
    });

    return searchResults;
  });
