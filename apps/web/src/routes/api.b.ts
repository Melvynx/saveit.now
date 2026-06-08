import { createBookmark } from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const GET = userRoute
  .query(z.object({ url: z.string().url() }))
  .handler(async (request, { query, ctx }) => {
    await createBookmark({
      url: query.url,
      userId: ctx.user.id,
    });

    return Response.redirect(new URL("/app", request.url));
  });

export const Route = createFileRoute("/api/b")({
  server: { handlers: { GET } },
});
