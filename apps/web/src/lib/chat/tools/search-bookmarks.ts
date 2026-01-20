import { searchByText } from "@/lib/search/search-by-query";
import { BookmarkType } from "@workspace/database";
import { tool } from "ai";
import { z } from "zod";

const bookmarkTypeEnum = z.enum([
  "VIDEO",
  "ARTICLE",
  "PAGE",
  "IMAGE",
  "YOUTUBE",
  "TWEET",
  "PDF",
  "PRODUCT",
]);

const specialFilterEnum = z.enum(["READ", "UNREAD", "STAR"]);

export const createSearchBookmarksTool = (userId: string) =>
  tool({
    description: `Internal search tool - search through bookmarks and return results for YOUR analysis. Results are NOT displayed to the user. Use this to find relevant bookmarks, then call showBookmarks to display them.

You can filter by:
- types: VIDEO, ARTICLE, PAGE, IMAGE, YOUTUBE, TWEET, PDF, PRODUCT
- tags: array of tag names to filter by
- filters: READ (already read), UNREAD (not read yet), STAR (starred/favorite)`,
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant bookmarks"),
      limit: z
        .number()
        .optional()
        .default(6)
        .describe("Maximum number of results to return"),
      types: z
        .array(bookmarkTypeEnum)
        .optional()
        .describe(
          "Filter by bookmark types: VIDEO, ARTICLE, PAGE, IMAGE, YOUTUBE, TWEET, PDF, PRODUCT",
        ),
      tags: z.array(z.string()).optional().describe("Filter by tag names"),
      filters: z
        .array(specialFilterEnum)
        .optional()
        .describe("Special filters: READ, UNREAD, STAR"),
    }),
    execute: async ({
      query,
      limit,
      types,
      tags,
      filters,
    }: {
      query: string;
      limit: number;
      types?: z.infer<typeof bookmarkTypeEnum>[];
      tags?: string[];
      filters?: z.infer<typeof specialFilterEnum>[];
    }) => {
      const results = await searchByText({
        userId,
        query,
        matchingDistance: 0.8,
        types: types as BookmarkType[] | undefined,
        tags,
        specialFilters: filters,
      });

      const limitedResults = results.slice(0, Math.min(limit, 20));

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
