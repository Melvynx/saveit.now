import { getUserBookmark } from "@/lib/database/get-bookmark";
import { tool } from "ai";
import { z } from "zod";

export const createShowBookmarkTool = (userId: string) =>
  tool({
    description:
      "Display a single bookmark card with full details to the user. Pass the bookmark ID and the server will fetch and display it.",
    inputSchema: z.object({
      bookmarkId: z.string().describe("The bookmark ID to display"),
    }),
    execute: async ({ bookmarkId }: { bookmarkId: string }) => {
      const bookmark = await getUserBookmark(bookmarkId, userId);

      if (!bookmark) {
        return { error: "Bookmark not found" };
      }

      return {
        bookmark: {
          id: bookmark.id,
          url: bookmark.url,
          type: bookmark.type,
          title: bookmark.title,
          summary: bookmark.summary,
          ogImageUrl: bookmark.ogImageUrl,
          metadata: bookmark.metadata,
          starred: bookmark.starred,
          read: bookmark.read,
          status: bookmark.status,
          faviconUrl: bookmark.faviconUrl,
          preview: bookmark.preview,
          note: bookmark.note,
          createdAt: bookmark.createdAt,
          tags: bookmark.tags,
        },
      };
    },
  });
