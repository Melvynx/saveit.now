"use server";

import { SafeActionError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const updateBookmarkCardTagsAction = userAction
  .schema(
    z.object({
      bookmarkId: z.string(),
      tags: z.array(z.string()),
    }),
  )
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    // 1. Get current bookmark tags
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: input.bookmarkId,
        userId: user.id, // Ensure user owns this bookmark
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!bookmark) {
      throw new SafeActionError("Bookmark not found or unauthorized");
    }

    const currentTags = bookmark.tags.map((t) => t.tag.name);

    // 2. Determine tags to add and remove
    const tagsToAdd = input.tags.filter((tag) => !currentTags.includes(tag));
    const tagsToRemove = currentTags.filter((tag) => !input.tags.includes(tag));

    // 3. Process tag changes
    // Remove tags
    await Promise.all(
      tagsToRemove.map(async (tagName) => {
        const tag = await prisma.tag.findUnique({
          where: {
            userId_name: { userId: user.id, name: tagName },
          },
        });

        if (tag) {
          await prisma.bookmarkTag.delete({
            where: {
              bookmarkId_tagId: {
                bookmarkId: bookmark.id,
                tagId: tag.id,
              },
            },
          });
        }
      }),
    );

    // Add tags
    await Promise.all(
      tagsToAdd.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: {
            userId_name: { userId: user.id, name: tagName },
          },
          create: { name: tagName, userId: user.id, type: "USER" },
          update: {},
        });

        await prisma.bookmarkTag.create({
          data: {
            bookmarkId: bookmark.id,
            tagId: tag.id,
          },
        });
      }),
    );

    // Return updated bookmark with new tags
    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: input.bookmarkId },
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return {
      bookmarkId: updatedBookmark!.id,
      tags: updatedBookmark!.tags.map((t) => t.tag),
    };
  });
