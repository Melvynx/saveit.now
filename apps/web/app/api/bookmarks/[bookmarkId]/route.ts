import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .handler(async (req, { params, ctx }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: params.bookmarkId,
        userId: ctx.user.id,
      },
      include: {
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
      },
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { bookmark },
      {
        headers: {
          ...(bookmark.status === "READY" && {
            "Cache-Control": "public, max-age=60",
          }),
        },
      },
    );
  });
