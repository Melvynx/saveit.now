"use server";

import { deleteBookmark } from "@/lib/database/delete-bookmark";
import { SafeActionError } from "@/lib/errors";
import { inngest } from "@/lib/inngest/client";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const updateBookmarkTagsAction = userAction
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
          create: { name: tagName, userId: user.id },
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
    return {
      ...bookmark,
      tags: input.tags.map((name) => name),
    };
  });

export const deleteBookmarkAction = userAction
  .schema(z.object({ bookmarkId: z.string() }))
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    const bookmark = await deleteBookmark({
      id: input.bookmarkId,
      userId: user.id,
    });

    return {
      bookmark,
      success: true,
    };
  });

export const reBookmarkAction = userAction
  .schema(z.object({ bookmarkId: z.string() }))
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: input.bookmarkId, userId: user.id },
    });

    if (!bookmark) {
      throw new SafeActionError("Bookmark not found or unauthorized");
    }

    await inngest.send({
      name: "bookmark/process",
      data: {
        bookmarkId: bookmark.id,
        userId: user.id,
      },
    });

    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        status: "PENDING",
      },
    });

    return {
      success: true,
    };
  });

export const toggleStarBookmarkAction = userAction
  .schema(z.object({ bookmarkId: z.string() }))
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: input.bookmarkId, userId: user.id },
      select: { starred: true },
    });

    if (!bookmark) {
      throw new SafeActionError("Bookmark not found or unauthorized");
    }

    const updatedBookmark = await prisma.bookmark.update({
      where: { id: input.bookmarkId },
      data: {
        starred: !bookmark.starred,
      },
      select: {
        id: true,
        starred: true,
      },
    });

    return {
      bookmarkId: updatedBookmark.id,
      starred: updatedBookmark.starred,
    };
  });

export const toggleReadBookmarkAction = userAction
  .schema(z.object({ bookmarkId: z.string() }))
  .action(async ({ parsedInput: input, ctx: { user } }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: input.bookmarkId, userId: user.id },
      select: { read: true, type: true },
    });

    if (!bookmark) {
      throw new SafeActionError("Bookmark not found or unauthorized");
    }

    if (bookmark.type !== "ARTICLE" && bookmark.type !== "YOUTUBE") {
      throw new SafeActionError("Bookmark does not support read functionality");
    }

    const updatedBookmark = await prisma.bookmark.update({
      where: { id: input.bookmarkId },
      data: {
        read: !bookmark.read,
      },
      select: {
        id: true,
        read: true,
      },
    });

    return {
      bookmarkId: updatedBookmark.id,
      read: updatedBookmark.read,
    };
  });
