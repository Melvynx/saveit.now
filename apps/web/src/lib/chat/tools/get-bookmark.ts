import { getUserBookmark } from "@/lib/database/get-bookmark";
import { tool } from "ai";
import { z } from "zod";

export const createGetBookmarkTool = (userId: string) =>
  tool({
    description:
      "Get detailed information about a specific bookmark by its ID. Returns full bookmark data including tags, notes, and metadata.",
    inputSchema: z.object({
      id: z.string().describe("The bookmark ID to retrieve"),
    }),
    execute: async ({ id }: { id: string }) => {
      const bookmark = await getUserBookmark(id, userId);

      if (!bookmark) {
        return { error: "Bookmark not found" };
      }

      return {
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
        updatedAt: bookmark.updatedAt,
        tags: bookmark.tags,
      };
    },
  });
