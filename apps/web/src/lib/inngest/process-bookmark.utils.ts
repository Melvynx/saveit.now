import { BookmarkStatus, BookmarkType, prisma } from "@workspace/database";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { GEMINI_MODELS } from "../gemini";
import { OPENAI_MODELS } from "../openai";

/**
 * Generates AI-powered tags from content and creates them in the database
 * @param systemPrompt System instructions for the AI model
 * @param prompt Content to analyze for tag generation
 * @param userId User ID to associate tags with
 * @returns Array of created/found tag objects with id and name
 */
export async function generateAndCreateTags(
  systemPrompt: string,
  prompt: string,
  userId: string,
): Promise<Array<{ id: string; name: string }>> {
  // Fetch user's existing tags to encourage reuse
  const existingTags = await prisma.tag.findMany({
    where: { userId },
    select: { name: true },
  });

  const existingTagNames = existingTags.map((tag) => tag.name);

  // Include existing tags in the system prompt to encourage reuse
  const enhancedSystemPrompt =
    existingTagNames.length > 0
      ? `${systemPrompt}\n\nExisting user tags: ${existingTagNames.join(", ")}\nPrioritize reusing these existing tags when appropriate before creating new ones.`
      : systemPrompt;

  const { object } = await generateObject({
    model: OPENAI_MODELS.cheap,
    schema: z.object({
      tags: z.array(z.string()),
    }),
    system: enhancedSystemPrompt,
    prompt,
  });

  // Extract tag names from the generated tags
  const tagNames = (object as { tags?: string[] }).tags || [];

  // Create or connect tags for the user
  const results = await Promise.all(
    tagNames.map(async (name: string) => {
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
          type: "IA",
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

  return results.filter(
    (result): result is { id: string; name: string } => result !== null,
  );
}

/**
 * Generates AI-powered content summary with optional debug file saving
 * @param systemPrompt System instructions for the AI model
 * @param prompt Content to summarize
 * @param debugInfo Optional debug information for file saving
 * @returns Generated summary text
 */
export async function generateContentSummary(
  systemPrompt: string,
  prompt: string,
  debugInfo?: {
    bookmarkId: string;
    type: "user" | "vector";
  },
): Promise<string> {
  const summary = await generateText({
    model: GEMINI_MODELS.cheap,
    system: systemPrompt,
    prompt,
  });

  const result = summary.text || "";

  // Save debug files if debug info is provided
  if (debugInfo && process.env.NODE_ENV === "development") {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      const debugDir = path.join(
        process.cwd(),
        "debug",
        "process-bookmark",
        debugInfo.bookmarkId,
      );
      await fs.mkdir(debugDir, { recursive: true });

      await fs.writeFile(
        path.join(debugDir, `${debugInfo.type}-system.md`),
        systemPrompt,
      );

      await fs.writeFile(
        path.join(debugDir, `${debugInfo.type}-prompt.md`),
        prompt,
      );

      await fs.writeFile(
        path.join(debugDir, `${debugInfo.type}-result.md`),
        result,
      );
    } catch {
      // Silently ignore debug file errors
    }
  }

  return result;
}

/**
 * Splits markdown content into smaller chunks for vector embedding processing
 * @param markdown Markdown content to split into chunks
 * @returns Array of text chunks, each under 1000 characters
 */
export function splitMarkdownIntoChunks(markdown: string): string[] {
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
 * Centralized bookmark update function with tag association and processing status management
 * @param params Bookmark update parameters including metadata, tags, and status
 * @returns The updated bookmark record
 */
export async function updateBookmarkWithMetadata(params: {
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
  const finalStatus = params.status || BookmarkStatus.READY;

  const bookmarkUpdate = prisma.bookmark.update({
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
      status: finalStatus,
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

  // Execute the bookmark update
  await bookmarkUpdate;

  // If the bookmark is being marked as ready, also mark the processing run as completed
  if (finalStatus === BookmarkStatus.READY) {
    // Get the bookmark to extract the inngestRunId
    const currentBookmark = await prisma.bookmark.findUnique({
      where: { id: params.bookmarkId },
      select: { inngestRunId: true },
    });

    if (currentBookmark?.inngestRunId) {
      await prisma.bookmarkProcessingRun.update({
        where: {
          inngestRunId: currentBookmark.inngestRunId,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }
  }

  return await prisma.bookmark.findUnique({
    where: { id: params.bookmarkId },
  });
}
