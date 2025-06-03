"use server";

import { createBookmark } from "@/lib/database/create-bookmark";
import { userAction } from "@/lib/safe-action";
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
          const bookmark = await createBookmark({
            url,
            userId: user.id,
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
