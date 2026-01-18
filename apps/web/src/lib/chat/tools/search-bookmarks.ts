import { searchByText } from "@/lib/search/search-by-query";
import { tool } from "ai";
import { z } from "zod";

export const createSearchBookmarksTool = (userId: string) =>
  tool({
    description:
      "Internal search tool - search through bookmarks and return results for YOUR analysis. Results are NOT displayed to the user. Use this to find relevant bookmarks, then call showBookmarks to display them.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant bookmarks"),
      limit: z
        .number()
        .optional()
        .default(6)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, limit }: { query: string; limit: number }) => {
      const results = await searchByText({
        userId,
        query,
        matchingDistance: 0.8,
      });

      const limitedResults = results.slice(0, Math.min(limit, 12));

      return limitedResults.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        type: bookmark.type,
        title: bookmark.title,
        summary: bookmark.summary,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        metadata: bookmark.metadata,
        starred: bookmark.starred ?? false,
        read: bookmark.read ?? false,
        status: bookmark.status,
        faviconUrl: bookmark.faviconUrl,
        preview: bookmark.preview,
        createdAt: bookmark.createdAt,
        tags: bookmark.tags,
      }));
    },
  });
