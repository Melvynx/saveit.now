import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/bookmarks/info")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const bookmarksCount = await prisma.bookmark.count({
          where: { userId: user.id },
        });

        return Response.json({ bookmarksCount });
      },
    },
  },
});
