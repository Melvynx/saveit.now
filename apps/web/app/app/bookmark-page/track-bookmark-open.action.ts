"use server";

import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

const TrackBookmarkOpenSchema = z.object({
  bookmarkId: z.string(),
});

export const trackBookmarkOpenAction = userAction
  .schema(TrackBookmarkOpenSchema)
  .action(async ({ parsedInput: { bookmarkId }, ctx: { user } }) => {
    await prisma.bookmarkOpen.create({
      data: {
        bookmarkId,
        userId: user.id,
      },
    });

    return { success: true };
  });