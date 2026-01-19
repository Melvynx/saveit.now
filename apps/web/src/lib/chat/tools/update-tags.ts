import { prisma } from "@workspace/database";
import { tool } from "ai";
import { z } from "zod";

export const createUpdateTagsTool = (userId: string) =>
  tool({
    description:
      "Add or remove tags from one or more bookmarks. Use this to organize bookmarks by adding relevant tags or removing irrelevant ones.",
    inputSchema: z.object({
      bookmarkIds: z
        .array(z.string())
        .describe("Array of bookmark IDs to update"),
      add: z
        .array(z.string())
        .optional()
        .describe("Tag names to add to the bookmarks"),
      remove: z
        .array(z.string())
        .optional()
        .describe("Tag names to remove from the bookmarks"),
    }),
    execute: async ({
      bookmarkIds,
      add = [],
      remove = [],
    }: {
      bookmarkIds: string[];
      add?: string[];
      remove?: string[];
    }) => {
      if (bookmarkIds.length === 0) {
        return { error: "No bookmark IDs provided" };
      }

      if (add.length === 0 && remove.length === 0) {
        return { error: "No tags to add or remove" };
      }

      const bookmarks = await prisma.bookmark.findMany({
        where: {
          id: { in: bookmarkIds },
          userId,
        },
        select: {
          id: true,
          title: true,
          tags: {
            select: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (bookmarks.length === 0) {
        return { error: "No bookmarks found with the provided IDs" };
      }

      const cleanAdd = Array.from(
        new Set(add.filter((t) => t?.trim()).map((t) => t.trim())),
      );
      const cleanRemove = Array.from(
        new Set(remove.filter((t) => t?.trim()).map((t) => t.trim())),
      );

      let tagsAdded = 0;
      let tagsRemoved = 0;

      for (const bookmark of bookmarks) {
        const currentTags = bookmark.tags.map((t) => t.tag.name);

        for (const tagName of cleanRemove) {
          if (currentTags.includes(tagName)) {
            const tag = await prisma.tag.findUnique({
              where: { userId_name: { userId, name: tagName } },
            });
            if (tag) {
              await prisma.bookmarkTag.delete({
                where: {
                  bookmarkId_tagId: { bookmarkId: bookmark.id, tagId: tag.id },
                },
              });
              tagsRemoved++;
            }
          }
        }

        for (const tagName of cleanAdd) {
          if (!currentTags.includes(tagName)) {
            const tag = await prisma.tag.upsert({
              where: { userId_name: { userId, name: tagName } },
              create: { name: tagName, userId, type: "USER" },
              update: {},
            });
            await prisma.bookmarkTag.create({
              data: { bookmarkId: bookmark.id, tagId: tag.id },
            });
            tagsAdded++;
          }
        }
      }

      return {
        success: true,
        bookmarksUpdated: bookmarks.length,
        tagsAdded,
        tagsRemoved,
        addedTags: cleanAdd,
        removedTags: cleanRemove,
      };
    },
  });
