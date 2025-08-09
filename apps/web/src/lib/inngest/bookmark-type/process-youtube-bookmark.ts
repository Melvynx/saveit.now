/* eslint-disable @typescript-eslint/no-explicit-any */
import { BookmarkType, prisma } from "@workspace/database";
import { logger } from "../../logger";
import { embedMany } from "ai";
import { z } from "zod";
import { uploadFileToS3 } from "../../aws-s3/aws-s3-upload-files";
import { env } from "../../env";
import { OPENAI_MODELS } from "../../openai";
import { getServerUrl } from "../../server-url";
import { upfetch } from "../../up-fetch";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "../process-bookmark.utils";
import {
  TAGS_PROMPT,
  YOUTUBE_SUMMARY_PROMPT,
  YOUTUBE_VECTOR_SUMMARY_PROMPT,
} from "../prompt.const";

function getVideoId(url: string): string {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1] || "";
}

export async function processYouTubeBookmark(
  context: {
    bookmarkId: string;
    userId: string;
    url: string;
    content: string;
  },
  step: InngestStep,
  publish: InngestPublish,
): Promise<void> {
  const youtubeId = getVideoId(context.url);

  // Check if this YouTube video has already been processed
  const existingBookmarkWithSameVideo = await step.run("check-existing-youtube-video", async () => {
    return await prisma.bookmark.findFirst({
      where: {
        type: BookmarkType.YOUTUBE,
        metadata: {
          path: ["youtubeId"],
          equals: youtubeId,
        },
        status: "READY",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        vectorSummary: true,
        preview: true,
        faviconUrl: true,
        metadata: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  });

  // If we found an existing processed bookmark with the same YouTube video, copy its data
  if (existingBookmarkWithSameVideo) {
    await publish({
      channel: `bookmark:${context.bookmarkId}`,
      topic: "status",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID["saving"],
        order: 8,
      },
    });

    await step.run("copy-existing-youtube-data", async () => {
      // Copy all the processed data from the existing bookmark
      const metadata = existingBookmarkWithSameVideo.metadata as Record<string, any> || {};
      
      await updateBookmark({
        bookmarkId: context.bookmarkId,
        type: BookmarkType.YOUTUBE,
        title: existingBookmarkWithSameVideo.title || context.url,
        summary: existingBookmarkWithSameVideo.summary || "",
        vectorSummary: existingBookmarkWithSameVideo.vectorSummary || "",
        preview: existingBookmarkWithSameVideo.preview,
        faviconUrl: existingBookmarkWithSameVideo.faviconUrl || `${getServerUrl()}/favicon/youtube.svg`,
        tags: existingBookmarkWithSameVideo.tags.map(bt => bt.tag),
        metadata: {
          ...metadata,
          youtubeId,
          dataCopiedFrom: existingBookmarkWithSameVideo.id,
          dataCopiedAt: new Date().toISOString(),
        },
      });
    });

    // Generate embeddings for the new bookmark based on copied data
    await step.run("update-embedding", async () => {
      const title = existingBookmarkWithSameVideo.title || context.url;
      const vectorSummary = existingBookmarkWithSameVideo.vectorSummary || "";

      if (!vectorSummary) {
        const embedding = await embedMany({
          model: OPENAI_MODELS.embedding,
          values: [title],
        });
        const [titleEmbedding] = embedding.embeddings;

        await prisma.$executeRaw`
          UPDATE "Bookmark"
          SET 
            "titleEmbedding" = ${titleEmbedding}::vector
          WHERE id = ${context.bookmarkId}
        `;
        return;
      }

      const embedding = await embedMany({
        model: OPENAI_MODELS.embedding,
        values: [title, vectorSummary],
      });
      const [titleEmbedding, vectorSummaryEmbedding] = embedding.embeddings;

      await prisma.$executeRaw`
        UPDATE "Bookmark"
        SET 
          "titleEmbedding" = ${titleEmbedding}::vector,
          "vectorSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
        WHERE id = ${context.bookmarkId}
      `;
    });

    await publish({
      channel: `bookmark:${context.bookmarkId}`,
      topic: "finish",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID["finish"],
        order: 9,
      },
    });

    return; // Early return - we've successfully copied data from existing bookmark
  }

  // If no existing bookmark found, proceed with normal processing
  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["transcript-video"],
      order: 3,
    },
  });

  // Check if bookmark already has transcript from extension
  const existingBookmark = await step.run("get-existing-bookmark", async () => {
    return await prisma.bookmark.findUnique({
      where: { id: context.bookmarkId },
      select: { metadata: true },
    });
  });

  const extensionTranscript =
    existingBookmark?.metadata &&
    typeof existingBookmark.metadata === "object" &&
    existingBookmark.metadata !== null &&
    "transcript" in existingBookmark.metadata
      ? ((existingBookmark.metadata as Record<string, any>)
          .transcript as string)
      : null;

  logger.debug("Extension transcript available:", !!extensionTranscript);

  // Get video info including title, thumbnails, and other metadata
  const videoInfo = await step.run(
    "get-video-info",
    async (): Promise<{
      title: string;
      thumbnail: string;
      transcript?: string;
      transcriptSource: "extension" | "worker" | "none";
    }> => {
      // If we don't have extension transcript, try to get from worker
      if (!extensionTranscript) {
        try {
          const data = await upfetch(
            `${env.SCREENSHOT_WORKER_URL}/youtube?videoId=${youtubeId}`,
            {
              schema: z.object({
                title: z.string(),
                thumbnail: z.string(),
                transcript: z.string().optional(),
              }),
            },
          );
          return {
            ...data,
            transcript: data.transcript,
            transcriptSource: "worker" as const,
          };
        } catch (error) {
          logger.debug("Failed to get video info from worker:", error);
          // Return minimal info if worker fails
          return {
            title: context.url,
            thumbnail: "",
            transcript: undefined,
            transcriptSource: "none" as const,
          };
        }
      } else {
        // Use extension transcript, but still get video metadata
        try {
          const data = await upfetch(
            `${env.SCREENSHOT_WORKER_URL}/youtube?videoId=${youtubeId}`,
            {
              schema: z.object({
                title: z.string(),
                thumbnail: z.string(),
                transcript: z.string().optional(),
              }),
            },
          );
          return {
            ...data,
            transcript: extensionTranscript,
            transcriptSource: "extension" as const,
          };
        } catch (error) {
          logger.debug("Failed to get video metadata from worker:", error);
          // Fallback to using just extension transcript with basic info
          return {
            title: context.url,
            thumbnail: "",
            transcript: extensionTranscript,
            transcriptSource: "extension" as const,
          };
        }
      }
    },
  );

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["extract-metadata"],
      order: 4,
    },
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["screenshot"],
      order: 5,
    },
  });

  const images = await step.run("save-screenshot", async () => {
    const result: { ogImageUrl?: string } = {};

    if (videoInfo.thumbnail) {
      try {
        const fetchOgImage = await fetch(videoInfo.thumbnail);
        const ogImageBuffer = await fetchOgImage.arrayBuffer();
        const ogImageFile = new File([ogImageBuffer], "og-image.jpg", {
          type: "image/png",
        });

        const ogImageUrl = await uploadFileToS3({
          file: ogImageFile,
          prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
          fileName: "og-image",
        });
        result.ogImageUrl = ogImageUrl;
      } catch (error) {
        logger.debug("Error saving thumbnail:", error);
      }
    }

    return result;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 6,
    },
  });

  // Generate a summary of the transcript
  const summary = await step.run("get-summary", async () => {
    if (!videoInfo.transcript) {
      return "";
    }
    return await getAISummary(YOUTUBE_SUMMARY_PROMPT, videoInfo.transcript);
  });

  const vectorSummary = await step.run("get-vector-summary", async () => {
    if (!videoInfo.transcript) {
      return "";
    }
    return await getAISummary(
      YOUTUBE_VECTOR_SUMMARY_PROMPT,
      videoInfo.transcript,
    );
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 7,
    },
  });

  // Generate tags for the video
  const tags = await step.run("get-tags", async () => {
    return await getAITags(TAGS_PROMPT, summary, context.userId);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["saving"],
      order: 8,
    },
  });

  // Update the bookmark with the analysis, summary, tags, and image URL
  await step.run("update-bookmark", async () => {
    // Preserve existing metadata and add new information
    const finalMetadata: Record<string, any> = {
      ...((existingBookmark?.metadata as object) || {}),
      youtubeId,
      transcriptAvailable: !!videoInfo.transcript,
      transcriptSource: videoInfo.transcriptSource,
    };

    // Store transcript in metadata if available
    if (videoInfo.transcript) {
      finalMetadata.transcript = videoInfo.transcript;
      finalMetadata.transcriptExtractedAt = new Date().toISOString();
    }

    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.YOUTUBE,
      title: videoInfo.title,
      summary: summary || "",
      vectorSummary: vectorSummary || "",
      preview: images.ogImageUrl,
      faviconUrl: `${getServerUrl()}/favicon/youtube.svg`,
      tags: tags,
      metadata: finalMetadata,
    });
  });

  await step.run("update-embedding", async () => {
    if (!summary && !vectorSummary) {
      const embedding = await embedMany({
        model: OPENAI_MODELS.embedding,
        values: [videoInfo.title],
      });
      const [titleEmbedding] = embedding.embeddings;

      // Update embeddings in database
      await prisma.$executeRaw`
        UPDATE "Bookmark"
        SET 
          "titleEmbedding" = ${titleEmbedding}::vector
        WHERE id = ${context.bookmarkId}
      `;
      return;
    }

    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [videoInfo.title, vectorSummary],
    });
    const [titleEmbedding, vectorSummaryEmbedding] = embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "titleEmbedding" = ${titleEmbedding}::vector,
        "vectorSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
      WHERE id = ${context.bookmarkId}
    `;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["finish"],
      order: 9,
    },
  });
}
