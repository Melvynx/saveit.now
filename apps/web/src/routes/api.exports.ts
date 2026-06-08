import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/exports")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [
          { getAuthLimits },
          { getUserMetadata },
          { requireUser },
          { prisma },
        ] = await Promise.all([
          import("@/lib/auth-limits"),
          import("@/lib/database/user-metadata.utils"),
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const subscription = await prisma.subscription.findFirst({
          where: {
            referenceId: user.id,
            status: { in: ["active", "trialing"] },
          },
        });
        const metadata = await getUserMetadata(user.id);
        const limits = getAuthLimits(subscription, metadata);

        if (limits.canExport === 0) {
          return Response.json(
            { error: "You have reached the maximum number of exports" },
            { status: 400 },
          );
        }

        const bookmarks = await prisma.bookmark.findMany({
          where: {
            userId: user.id,
          },
          select: {
            title: true,
            ogDescription: true,
            summary: true,
            type: true,
            url: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        const csvHeader = "title,description,summary,type,url\n";
        const csvRows = bookmarks
          .map((bookmark) => {
            const title = escapeCsvField(bookmark.title || "");
            const description = escapeCsvField(bookmark.ogDescription || "");
            const summary = escapeCsvField(bookmark.summary || "");
            const type = escapeCsvField(bookmark.type || "");
            const url = escapeCsvField(bookmark.url);

            return `${title},${description},${summary},${type},${url}`;
          })
          .join("\n");

        return Response.json({
          csvContent: csvHeader + csvRows,
          totalBookmarks: bookmarks.length,
        });
      },
    },
  },
});

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
