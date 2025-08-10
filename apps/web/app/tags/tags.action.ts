"use server";

import { ApplicationError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

const TagRefactorSchema = z.object({
  bestTag: z.string().min(1, "Best tag name is required"),
  refactorTagIds: z.array(z.string()).min(1, "At least one tag to refactor is required"),
  createBestTag: z.boolean().optional().default(false),
});

const BulkTagRefactorSchema = z.object({
  refactors: z.array(TagRefactorSchema).min(1, "At least one refactor operation is required"),
});

/**
 * Applies tag consolidation by merging multiple tags into a single canonical tag
 */
export const applyTagRefactorAction = userAction
  .schema(BulkTagRefactorSchema)
  .action(async ({ parsedInput, ctx: { user } }) => {
    const { refactors } = parsedInput;

    try {
      const results = await prisma.$transaction(async (tx) => {
        const operationResults = [];

        for (const refactor of refactors) {
          const { bestTag, refactorTagIds, createBestTag } = refactor;

          // Verify all refactor tags belong to the user
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
            throw new ApplicationError("Some tags don't exist or don't belong to you");
          }

          // Find or create the best tag
          let bestTagRecord = await tx.tag.findFirst({
            where: {
              name: bestTag,
              userId: user.id,
            },
          });

          if (!bestTagRecord && createBestTag) {
            bestTagRecord = await tx.tag.create({
              data: {
                name: bestTag,
                userId: user.id,
                type: "USER",
              },
            });
          }

          if (!bestTagRecord) {
            throw new ApplicationError(`Best tag "${bestTag}" doesn't exist. Set createBestTag to true to create it.`);
          }

          // Get all bookmark IDs that have any of the refactor tags
          const bookmarkTagRelations = await tx.bookmarkTag.findMany({
            where: {
              tagId: { in: refactorTagIds },
            },
            select: {
              bookmarkId: true,
              tagId: true,
            },
          });

          const affectedBookmarkIds = [...new Set(bookmarkTagRelations.map(r => r.bookmarkId))];

          // For each affected bookmark, ensure it has the best tag
          for (const bookmarkId of affectedBookmarkIds) {
            // Check if bookmark already has the best tag
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

          // Remove all bookmark relations for the old tags
          await tx.bookmarkTag.deleteMany({
            where: {
              tagId: { in: refactorTagIds },
            },
          });

          // Delete the old tags
          await tx.tag.deleteMany({
            where: {
              id: { in: refactorTagIds },
              userId: user.id,
            },
          });

          const totalBookmarksAffected = affectedBookmarkIds.length;

          operationResults.push({
            bestTag: bestTag,
            refactoredTags: tagsToRefactor.map(t => t.name),
            bookmarksAffected: totalBookmarksAffected,
            tagsRemoved: tagsToRefactor.length,
            created: createBestTag && !bestTagRecord,
          });
        }

        return operationResults;
      });

      const totalBookmarksAffected = results.reduce((sum, r) => sum + r.bookmarksAffected, 0);
      const totalTagsRemoved = results.reduce((sum, r) => sum + r.tagsRemoved, 0);

      return {
        success: true,
        results,
        summary: {
          operationsApplied: results.length,
          totalBookmarksAffected,
          totalTagsRemoved,
        },
      };
    } catch (error) {
      console.error("Tag refactor error:", error);
      
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      throw new ApplicationError("Failed to apply tag refactoring. Please try again.");
    }
  });

/**
 * Deletes multiple tags and all their bookmark associations
 */
export const bulkDeleteTagsAction = userAction
  .schema(z.object({
    tagIds: z.array(z.string()).min(1, "At least one tag is required"),
  }))
  .action(async ({ parsedInput, ctx: { user } }) => {
    const { tagIds } = parsedInput;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Verify all tags belong to the user and get their bookmark counts
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
          throw new ApplicationError("Some tags don't exist or don't belong to you");
        }

        // Delete bookmark-tag relations first (due to foreign key constraints)
        await tx.bookmarkTag.deleteMany({
          where: {
            tagId: { in: tagIds },
          },
        });

        // Delete the tags
        await tx.tag.deleteMany({
          where: {
            id: { in: tagIds },
            userId: user.id,
          },
        });

        const totalBookmarksAffected = tagsToDelete.reduce(
          (sum, tag) => sum + tag._count.bookmarks, 
          0
        );

        return {
          deletedTags: tagsToDelete.map(t => ({ id: t.id, name: t.name })),
          totalBookmarksAffected,
        };
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error("Bulk delete tags error:", error);
      
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      throw new ApplicationError("Failed to delete tags. Please try again.");
    }
  });