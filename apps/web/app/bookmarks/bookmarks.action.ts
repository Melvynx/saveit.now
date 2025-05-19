"use server";

import { inngest } from "@/lib/inngest/client";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";
import { URL_SCHEMA } from "./schema";

export const createBookmarkAction = userAction
  .schema(
    z.object({
      url: URL_SCHEMA,
    })
  )
  .action(async ({ parsedInput: { url }, ctx: { user } }) => {
    const bookmark = await prisma.bookmark.create({
      data: {
        url,
        userId: user.id,
      },
    });

    await inngest.send({
      name: "bookmark/process",
      data: {
        bookmarkId: bookmark.id,
      },
    });

    return bookmark;
  });
