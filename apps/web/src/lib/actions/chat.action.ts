import { userAction } from "@/lib/safe-action";
import { advancedSearch } from "@/lib/search/advanced-search";
import { createBookmark } from "@/lib/database/create-bookmark";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const createBookmarkAction = userAction
  .schema(
    z.object({
      url: z.string().url("Please provide a valid URL"),
    })
  )
  .action(async ({ parsedInput: { url }, ctx }) => {
    try {
      const bookmark = await createBookmark({
        url,
        userId: ctx.user.id,
      });

      return {
        success: true,
        bookmark: {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          summary: bookmark.summary,
          type: bookmark.type,
          ogImageUrl: bookmark.ogImageUrl,
          faviconUrl: bookmark.faviconUrl,
          createdAt: bookmark.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create bookmark",
      };
    }
  });

export const searchBookmarksAction = userAction
  .schema(
    z.object({
      query: z.string().min(1, "Query cannot be empty"),
      tags: z.array(z.string()).optional(),
      limit: z.number().min(1).max(50).optional().default(10),
    })
  )
  .action(async ({ parsedInput: { query, tags, limit }, ctx }) => {
    try {
      const results = await advancedSearch({
        userId: ctx.user.id,
        query,
        tags: tags || [],
        limit,
        matchingDistance: 0.2,
      });

      return {
        success: true,
        results: results.bookmarks.map((bookmark) => ({
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          summary: bookmark.summary,
          type: bookmark.type,
          ogImageUrl: bookmark.ogImageUrl,
          faviconUrl: bookmark.faviconUrl,
          score: bookmark.score,
          matchType: bookmark.matchType,
          matchedTags: bookmark.matchedTags,
          createdAt: bookmark.createdAt,
        })),
        totalResults: results.bookmarks.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to search bookmarks",
      };
    }
  });

export const getBookmarkAction = userAction
  .schema(
    z.object({
      id: z.string().min(1, "Bookmark ID is required"),
    })
  )
  .action(async ({ parsedInput: { id }, ctx }) => {
    try {
      const bookmark = await prisma.bookmark.findFirst({
        where: {
          id,
          userId: ctx.user.id,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      if (!bookmark) {
        return {
          success: false,
          error: "Bookmark not found",
        };
      }

      return {
        success: true,
        bookmark: {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          summary: bookmark.summary,
          preview: bookmark.preview,
          type: bookmark.type,
          status: bookmark.status,
          ogImageUrl: bookmark.ogImageUrl,
          ogDescription: bookmark.ogDescription,
          faviconUrl: bookmark.faviconUrl,
          tags: bookmark.tags.map((bt) => bt.tag.name),
          createdAt: bookmark.createdAt,
          metadata: bookmark.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get bookmark",
      };
    }
  });