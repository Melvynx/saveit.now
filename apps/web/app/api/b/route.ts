import { inngest } from "@/lib/inngest/client";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .query(z.object({ url: z.string().url() }))
  .handler(async (req, { query, ctx }) => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url: query.url,
        userId: ctx.user.id,
      },
    });

    await inngest.send({
      name: "bookmark/process",
      data: {
        bookmarkId: bookmark.id,
      },
    });

    return NextResponse.redirect(new URL("/bookmarks", req.url));
  });
