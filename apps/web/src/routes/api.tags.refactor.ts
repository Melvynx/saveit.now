import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TagRefactorSchema = z.object({
  bestTag: z.string().min(1, "Best tag name is required"),
  refactorTagIds: z
    .array(z.string())
    .min(1, "At least one tag to refactor is required"),
  createBestTag: z.boolean().optional().default(false),
});

const BulkTagRefactorSchema = z.object({
  refactors: z
    .array(TagRefactorSchema)
    .min(1, "At least one refactor operation is required"),
});

export const Route = createFileRoute("/api/tags/refactor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { refactors } = BulkTagRefactorSchema.parse(await request.json());
        const results = await prisma.$transaction(async (tx) => {
          const operationResults = [];

          for (const refactor of refactors) {
            const { bestTag, refactorTagIds, createBestTag } = refactor;

            const tagsToRefactor = await tx.tag.findMany({
              where: {
                id: { in: refactorTagIds },
                userId: user.id,
              },
              include: {
                _count: {
                  select: { bookmarks: true },
                },
              },
            });

            if (tagsToRefactor.length !== refactorTagIds.length) {
              throw new Error("Some tags don't exist or don't belong to you");
            }

            let bestTagRecord = await tx.tag.findFirst({
              where: {
                name: bestTag,
                userId: user.id,
              },
            });

            const shouldCreateBestTag = !bestTagRecord && createBestTag;
            if (shouldCreateBestTag) {
              bestTagRecord = await tx.tag.create({
                data: {
                  name: bestTag,
                  userId: user.id,
                  type: "USER",
                },
              });
            }

            if (!bestTagRecord) {
              throw new Error(
                `Best tag "${bestTag}" doesn't exist. Set createBestTag to true to create it.`,
              );
            }

            const bookmarkTagRelations = await tx.bookmarkTag.findMany({
              where: {
                tagId: { in: refactorTagIds },
              },
              select: {
                bookmarkId: true,
                tagId: true,
              },
            });

            const affectedBookmarkIds = [
              ...new Set(bookmarkTagRelations.map((relation) => relation.bookmarkId)),
            ];

            for (const bookmarkId of affectedBookmarkIds) {
              const existingRelation = await tx.bookmarkTag.findFirst({
                where: {
                  bookmarkId,
                  tagId: bestTagRecord.id,
                },
              });

              if (!existingRelation) {
                await tx.bookmarkTag.create({
                  data: {
                    bookmarkId,
                    tagId: bestTagRecord.id,
                  },
                });
              }
            }

            await tx.bookmarkTag.deleteMany({
              where: {
                tagId: { in: refactorTagIds },
              },
            });

            await tx.tag.deleteMany({
              where: {
                id: { in: refactorTagIds },
                userId: user.id,
              },
            });

            operationResults.push({
              bestTag,
              refactoredTags: tagsToRefactor.map((tag) => tag.name),
              bookmarksAffected: affectedBookmarkIds.length,
              tagsRemoved: tagsToRefactor.length,
              created: shouldCreateBestTag,
            });
          }

          return operationResults;
        });

        const totalBookmarksAffected = results.reduce(
          (sum, result) => sum + result.bookmarksAffected,
          0,
        );
        const totalTagsRemoved = results.reduce(
          (sum, result) => sum + result.tagsRemoved,
          0,
        );

        return Response.json({
          success: true,
          results,
          summary: {
            operationsApplied: results.length,
            totalBookmarksAffected,
            totalTagsRemoved,
          },
        });
      },
    },
  },
});
