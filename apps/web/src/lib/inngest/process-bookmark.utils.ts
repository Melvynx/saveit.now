import { BookmarkStatus, BookmarkType, prisma } from "@workspace/database";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { GEMINI_MODELS } from "../gemini";
import { OPENAI_MODELS } from "../openai";

/**
 * Generates tags for content using AI and saves them to the database
 * @param systemPrompt The prompt to send to the AI
 * @param userId The user ID to associate the tags with
 * @returns Array of tag objects with id and name
 */
export async function getAITags(
  systemPrompt: string,
  prompt: string,
  userId: string,
): Promise<Array<{ id: string; name: string }>> {
  const { object } = await generateObject({
    model: OPENAI_MODELS.cheap,
    schema: z.object({
      tags: z.array(z.string()),
    }),
    system: systemPrompt,
    prompt,
  });

  // Extract tag names from the generated tags
  const tagNames = object.tags || [];

  // Create or connect tags for the user
  const results = await Promise.all(
    tagNames.map(async (name) => {
      if (!name) return null;
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: {
            userId,
            name,
          },
        },
        create: {
          name,
          userId,
        },
        update: {},
        select: {
          id: true,
          name: true,
        },
      });

      return { id: tag.id, name: tag.name };
    }),
  );

  return results.filter((result) => result !== null);
}

/**
 * Generates a summary for content using AI
 * @param prompt The prompt to send to the AI
 * @returns The generated summary text
 */
export async function getAISummary(
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  const summary = await generateText({
    model: GEMINI_MODELS.cheap,
    system: systemPrompt,
    prompt,
  });

  return summary.text || "";
}

/**
 * Splits markdown content into chunks for embedding
 * @param markdown The markdown content to chunk
 * @returns Array of chunks
 */
export function chunkMarkdown(markdown: string): string[] {
  // Split by paragraphs or sections
  const paragraphs = markdown.split(/\n\s*\n/);

  // Initialize chunks array
  const chunks: string[] = [];
  let currentChunk = "";

  // Process each paragraph
  for (const paragraph of paragraphs) {
    // Skip empty paragraphs
    if (!paragraph.trim()) continue;

    // If adding this paragraph would exceed chunk size, save current chunk and start a new one
    if (currentChunk.length + paragraph.length > 1000) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      // Otherwise, add to current chunk
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Updates a bookmark with all its properties in a centralized way
 * @param params The parameters for updating the bookmark
 * @returns The updated bookmark
 */
export async function updateBookmark(params: {
  bookmarkId: string;
  type: BookmarkType;
  title?: string;
  vectorSummary?: string;
  summary?: string;
  preview?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  tags: Array<{ id: string; name: string }>;
  status?: BookmarkStatus;
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
  ogDescription?: string | null;
  imageDescription?: string | null;
}) {
  return await prisma.bookmark.update({
    where: { id: params.bookmarkId },
    data: {
      type: params.type,
      title: params.title,
      vectorSummary: params.vectorSummary || "",
      faviconUrl: params.faviconUrl,
      ogImageUrl: params.ogImageUrl,
      ogDescription: params.ogDescription,
      imageDescription: params.imageDescription,
      summary: params.summary || "",
      preview: params.preview,
      status: params.status || BookmarkStatus.READY,
      metadata: params.metadata,
      tags: {
        connectOrCreate: params.tags.map((tag) => ({
          create: {
            tagId: tag.id,
          },
          where: {
            bookmarkId_tagId: {
              bookmarkId: params.bookmarkId,
              tagId: tag.id,
            },
          },
        })),
      },
    },
  });
}

/**
 * Finds similar bookmarks based on URL and time conditions
 * @param url The URL to search for
 * @param excludeBookmarkId The bookmark ID to exclude from results
 * @returns Similar bookmark if found, null otherwise
 */
export async function findSimilarBookmark(
  url: string,
  excludeBookmarkId: string,
): Promise<{
  id: string;
  title: string | null;
  summary: string | null;
  vectorSummary: string | null;
  preview: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogDescription: string | null;
  imageDescription: string | null;
  tags: Array<{ id: string; name: string }>;
  createdAt: Date;
} | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // First, try to find a bookmark within 7 days (direct reuse)
  const recentBookmark = await prisma.bookmark.findFirst({
    where: {
      url,
      id: { not: excludeBookmarkId },
      status: BookmarkStatus.READY,
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (recentBookmark) {
    return {
      id: recentBookmark.id,
      title: recentBookmark.title,
      summary: recentBookmark.summary,
      vectorSummary: recentBookmark.vectorSummary,
      preview: recentBookmark.preview,
      faviconUrl: recentBookmark.faviconUrl,
      ogImageUrl: recentBookmark.ogImageUrl,
      ogDescription: recentBookmark.ogDescription,
      imageDescription: recentBookmark.imageDescription,
      tags: recentBookmark.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      createdAt: recentBookmark.createdAt,
    };
  }

  // If no recent bookmark found, look for bookmarks within 30 days
  const olderBookmarks = await prisma.bookmark.findMany({
    where: {
      url,
      id: { not: excludeBookmarkId },
      status: BookmarkStatus.READY,
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (olderBookmarks.length > 0) {
    const bookmark = olderBookmarks[0];
    if (bookmark) {
      return {
        id: bookmark.id,
        title: bookmark.title,
        summary: bookmark.summary,
        vectorSummary: bookmark.vectorSummary,
        preview: bookmark.preview,
        faviconUrl: bookmark.faviconUrl,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        imageDescription: bookmark.imageDescription,
        tags: bookmark.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
        createdAt: bookmark.createdAt,
      };
    }
  }

  return null;
}

/**
 * Copies data from a similar bookmark to the current bookmark
 * @param targetBookmarkId The ID of the bookmark to copy data to
 * @param sourceBookmark The source bookmark data to copy from
 * @param currentTitle The current title of the target bookmark
 * @param currentOgDescription The current OG description of the target bookmark
 * @returns Whether the data was copied successfully
 */
export async function copyBookmarkData(
  targetBookmarkId: string,
  sourceBookmark: {
    id: string;
    title: string | null;
    summary: string | null;
    vectorSummary: string | null;
    preview: string | null;
    faviconUrl: string | null;
    ogImageUrl: string | null;
    ogDescription: string | null;
    imageDescription: string | null;
    tags: Array<{ id: string; name: string }>;
    createdAt: Date;
  },
  currentTitle?: string,
  currentOgDescription?: string,
): Promise<boolean> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Determine if we should copy based on age and content similarity
  const shouldCopy = (
    // Direct reuse for bookmarks less than 7 days old
    sourceBookmark.createdAt >= sevenDaysAgo
  ) || (
    // Conditional reuse for bookmarks less than 30 days old with matching title/description
    sourceBookmark.createdAt >= thirtyDaysAgo &&
    sourceBookmark.createdAt < sevenDaysAgo &&
    (
      (currentTitle && sourceBookmark.title && currentTitle.trim() === sourceBookmark.title.trim()) ||
      (currentOgDescription && sourceBookmark.ogDescription && currentOgDescription.trim() === sourceBookmark.ogDescription.trim())
    )
  );

  if (!shouldCopy) {
    return false;
  }

  // Copy the bookmark data
  await prisma.bookmark.update({
    where: { id: targetBookmarkId },
    data: {
      title: sourceBookmark.title,
      summary: sourceBookmark.summary,
      vectorSummary: sourceBookmark.vectorSummary,
      preview: sourceBookmark.preview,
      faviconUrl: sourceBookmark.faviconUrl,
      ogImageUrl: sourceBookmark.ogImageUrl,
      ogDescription: sourceBookmark.ogDescription,
      imageDescription: sourceBookmark.imageDescription,
      status: BookmarkStatus.READY,
      tags: {
        connectOrCreate: sourceBookmark.tags.map((tag) => ({
          create: {
            tagId: tag.id,
          },
          where: {
            bookmarkId_tagId: {
              bookmarkId: targetBookmarkId,
              tagId: tag.id,
            },
          },
        })),
      },
    },
  });

  // Copy embeddings separately using raw SQL
  await prisma.$executeRaw`
    UPDATE "Bookmark"
    SET 
      "titleEmbedding" = src."titleEmbedding",
      "vectorSummaryEmbedding" = src."vectorSummaryEmbedding"
    FROM "Bookmark" src
    WHERE "Bookmark".id = ${targetBookmarkId}
    AND src.id = ${sourceBookmark.id}
  `;

  return true;
}
