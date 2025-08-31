import { deleteBookmark } from "@/lib/database/delete-bookmark";
import { apiRoute } from "@/lib/safe-route";
import { z } from "zod";

export const DELETE = apiRoute
  .params(
    z.object({
      bookmarkId: z.string(),
    }),
  )
  .handler(async (_, { ctx, params }) => {
    const result = await deleteBookmark({
      id: params.bookmarkId,
      userId: ctx.user.id,
    });

    return {
      success: true,
      bookmark: result,
    };
  });
