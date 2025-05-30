"use server";

import { inngest } from "@/lib/inngest/client";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

export const importBookmarksAction = userAction
  .schema(
    z.object({
      text: z.string(),
    }),
  )
  .action(async ({ parsedInput: { text }, ctx: { user } }) => {
    const urls = text.match(URL_REGEX) || [];
    const uniqueUrls = [...new Set(urls)];

    const bookmarks = await Promise.all(
      uniqueUrls.map(async (url) => {
        try {
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
              userId: user.id,
            },
          });

          return bookmark;
        } catch (error) {
          console.error(`Failed to create bookmark for ${url}:`, error);
          return null;
        }
      }),
    );

    return {
      totalUrls: uniqueUrls.length,
      createdBookmarks: bookmarks.filter(Boolean).length,
    };
  });
