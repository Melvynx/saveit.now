import { createBookmark } from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute
  .query(z.object({ url: z.string().url() }))
  .handler(async (req, { query, ctx }) => {
    await createBookmark({
      url: query.url,
      userId: ctx.user.id,
    });

    return NextResponse.redirect(new URL("/app", req.url));
  });
