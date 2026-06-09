import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tags/management")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

        const tags = await prisma.tag.findMany({
          where: {
            userId: user.id,
            ...(query && {
              name: {
                contains: query,
                mode: "insensitive",
              },
            }),
            ...(cursor && {
              id: {
                gt: cursor,
              },
            }),
          },
          include: {
            _count: {
              select: {
                bookmarks: true,
              },
            },
          },
          orderBy: {
            bookmarks: {
              _count: "desc",
            },
          },
          take: limit + 1,
        });

        const hasNextPage = tags.length > limit;
        const results = hasNextPage ? tags.slice(0, limit) : tags;
        const nextCursor = hasNextPage ? results[results.length - 1]?.id : null;

        return Response.json({
          tags: results,
          nextCursor,
          hasNextPage,
        });
      },
    },
  },
});
