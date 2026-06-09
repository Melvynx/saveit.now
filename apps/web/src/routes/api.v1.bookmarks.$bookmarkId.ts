import { deleteBookmark } from "@/lib/database/delete-bookmark";
import { apiRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const DELETE = apiRoute
  .params(z.object({ bookmarkId: z.string() }))
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

export const Route = createFileRoute("/api/v1/bookmarks/$bookmarkId")({
  server: { handlers: { DELETE } },
});
