import { inngest } from "@/lib/inngest/client";
import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";
import { getSubscriptionToken } from "@inngest/realtime";

export const Route = createFileRoute("/api/bookmarks/$bookmarkId/subscribe")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const bookmark = await prisma.bookmark.findUnique({
          where: {
            id: params.bookmarkId,
            userId: user.id,
          },
          select: { id: true },
        });

        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        const realtimeEnabled = !process.env.CI;

        if (!realtimeEnabled) {
          return Response.json({ token: null });
        }

        const token = await getSubscriptionToken(inngest, {
          channel: `bookmark:${bookmark.id}`,
          topics: ["status", "finish"],
        });

        return Response.json({ token });
      },
    },
  },
});
