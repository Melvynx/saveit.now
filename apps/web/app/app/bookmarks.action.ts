"use server";

import { createBookmark } from "@/lib/database/create-bookmark";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";
import { URL_SCHEMA } from "./schema";

export const createBookmarkAction = userAction
  .schema(
    z.object({
      url: URL_SCHEMA,
    }),
  )
  .action(async ({ parsedInput: { url }, ctx: { user } }) => {
    return createBookmark({
      url,
      userId: user.id,
    });
  });

export const updateBookmarkNoteAction = userAction
  .schema(
    z.object({
      bookmarkId: z.string(),
      note: z.string().nullable(),
    }),
  )
  .action(async ({ parsedInput: { bookmarkId, note }, ctx: { user } }) => {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: bookmarkId,
        userId: user.id,
      },
    });


    if (!bookmark) {
      throw new Error("Bookmark not found or unauthorized");
    }

    const updatedBookmark = await prisma.bookmark.update({
      where: {
        id: bookmarkId,
      },
      data: {
        note,
      },
    });

    return updatedBookmark;
  });
