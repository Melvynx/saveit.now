import { getUserBookmarksByIds } from "@/lib/database/get-bookmark";
import { tool } from "ai";
import { z } from "zod";

export const createShowBookmarksTool = (userId: string) =>
  tool({
    description:
      "Display a grid of bookmark cards to the user. Pass the bookmark IDs from your search results. The server will fetch and display them.",
    inputSchema: z.object({
      bookmarkIds: z
        .array(z.string())
        .describe("Array of bookmark IDs to display"),
      title: z
        .string()
        .optional()
        .describe("Optional title to display above the grid"),
    }),
    execute: async ({
      bookmarkIds,
      title,
    }: {
      bookmarkIds: string[];
      title?: string;
    }) => {
      const bookmarks = await getUserBookmarksByIds(bookmarkIds, userId);

      return {
        bookmarks: bookmarks.map((b) => ({
          id: b.id,
          url: b.url,
          type: b.type,
          title: b.title,
          summary: b.summary,
          ogImageUrl: b.ogImageUrl,
          metadata: b.metadata,
          starred: b.starred,
          read: b.read,
          status: b.status,
          faviconUrl: b.faviconUrl,
          preview: b.preview,
          createdAt: b.createdAt,
          tags: b.tags,
        })),
        title,
      };
    },
  });
