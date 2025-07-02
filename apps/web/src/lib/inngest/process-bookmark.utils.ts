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
  detailedSummary?: string;
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
      detailedSummary: params.detailedSummary || "",
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
