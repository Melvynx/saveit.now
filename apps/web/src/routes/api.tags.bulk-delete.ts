import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/tags/bulk-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { tagIds } = z
          .object({
            tagIds: z.array(z.string()).min(1, "At least one tag is required"),
          })
          .parse(await request.json());

        const result = await prisma.$transaction(async (tx) => {
          const tagsToDelete = await tx.tag.findMany({
            where: {
              id: { in: tagIds },
              userId: user.id,
            },
            include: {
              _count: {
                select: { bookmarks: true },
              },
            },
          });

          if (tagsToDelete.length !== tagIds.length) {
            throw new Error("Some tags don't exist or don't belong to you");
          }

          await tx.bookmarkTag.deleteMany({
            where: {
              tagId: { in: tagIds },
            },
          });

          await tx.tag.deleteMany({
            where: {
              id: { in: tagIds },
              userId: user.id,
            },
          });

          const totalBookmarksAffected = tagsToDelete.reduce(
            (sum, tag) => sum + tag._count.bookmarks,
            0,
          );

          return {
            deletedTags: tagsToDelete.map((tag) => ({
              id: tag.id,
              name: tag.name,
            })),
            totalBookmarksAffected,
          };
        });

        return Response.json({
          success: true,
          ...result,
        });
      },
    },
  },
});
