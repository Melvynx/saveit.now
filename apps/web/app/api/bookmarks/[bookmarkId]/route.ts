import { getUserBookmark } from "@/lib/database/get-bookmark";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .handler(async (req, { params, ctx }) => {
    const bookmark = await getUserBookmark(params.bookmarkId, ctx.user.id);

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
