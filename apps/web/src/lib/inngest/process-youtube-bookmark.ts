import { BookmarkType, prisma } from "@workspace/database";
import { embedMany } from "ai";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { OPENAI_MODELS } from "../openai";
import { InngestPublish, InngestStep } from "./inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "./process-bookmark.step";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";
import {
  TAGS_PROMPT,
  YOUTUBE_SUMMARY_PROMPT,
  YOUTUBE_VECTOR_SUMMARY_PROMPT,
} from "./prompt.const";

interface TranscriptEntry {
  text: string;
  duration: number;
  offset: number;
}

function getVideoId(url: string): string {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
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
  // Convert ArrayBuffer to Base64 for OpenAI Vision API
  const youtubeId = getVideoId(context.url);

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["transcript-video"],
      order: 3,
    },
  });

  // Analyze the image using OpenAI Vision
  const transcript = await step.run("get-transcript", async () => {
    const transcript: TranscriptEntry[] =
      await YoutubeTranscript.fetchTranscript(youtubeId);
    return transcript.map((t) => t.text).join(" ");
  });

  // Generate a title for the image

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["extract-metadata"],
      order: 4,
    },
  });

  // Extract the page title
  const pageMetadata = await step.run("extract-page-metadata", async () => {
    const $ = cheerio.load(context.content);

    // Try to get the title from common meta tags first, then fallback to the <title> tag
    const title =
      $("meta[property='og:title']").attr("content") ||
      $("meta[name='twitter:title']").attr("content") ||
      $("title").text() ||
      new URL(context.url).hostname; // Fallback to the domain name if no title is found

    // Find favicon in order of preference
    const faviconSelectors = [
      "link[rel='icon'][sizes='32x32']",
      "link[rel='shortcut icon']",
      "link[rel='icon']",
      "link[rel='apple-touch-icon']",
      "link[rel='apple-touch-icon-precomposed']",
    ];

    let faviconUrl = null;
    for (const selector of faviconSelectors) {
      const iconHref = $(selector).attr("href");
      if (iconHref) {
        faviconUrl = iconHref.startsWith("http")
          ? iconHref
          : `${new URL(context.url).origin}${iconHref}`;
        break;
      }
    }

    // If no favicon found, try the default /favicon.ico
    if (!faviconUrl) {
      faviconUrl = `${new URL(context.url).origin}/favicon.ico`;
    }

    const ogImageHref = $("meta[property='og:image']").attr("content");
    const ogImageUrl = ogImageHref
      ? ogImageHref.startsWith("http")
        ? ogImageHref
        : `${new URL(context.url).origin}${ogImageHref}`
      : null;
    const ogDescription =
      $("meta[property='og:description']").attr("content") || null;

    return {
      title: title.trim(),
      faviconUrl,
      ogImageUrl,
      ogDescription,
    };
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 5,
    },
  });

  // Generate a summary of the image
  const summary = await step.run("get-summary", async () => {
    return await getAISummary(YOUTUBE_SUMMARY_PROMPT, transcript);
  });

  const vectorSummary = await step.run("get-vector-summary", async () => {
    return await getAISummary(YOUTUBE_VECTOR_SUMMARY_PROMPT, transcript);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 6,
    },
  });

  // Generate tags for the image
  const tags = await step.run("get-tags", async () => {
    console.log({ userId: context.userId, summary });
    return await getAITags(TAGS_PROMPT, summary, context.userId);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["screenshot"],
      order: 7,
    },
  });

  const images = await step.run("save-screenshot", async () => {
    const result = {} as {
      ogImageUrl?: string;
    };

    if (pageMetadata.ogImageUrl) {
      const fetchOgImage = await fetch(pageMetadata.ogImageUrl);
      const ogImageBuffer = await fetchOgImage.arrayBuffer();
      const ogImageFile = new File([ogImageBuffer], "og-image.jpg", {
        type: "image/png",
      });

      const ogImageUrl = await uploadFileToS3({
        file: ogImageFile,
        prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "og-image",
      });
      result.ogImageUrl = ogImageUrl;
    }

    return result;
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
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.YOUTUBE,
      title: pageMetadata.title,
      summary: summary || "",
      preview: images.ogImageUrl,
      tags: tags,
      metadata: {
        youtubeId,
      },
    });
  });

  await step.run("update-embedding", async () => {
    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [pageMetadata.title, summary, vectorSummary],
    });
    const [titleEmbedding, summaryEmbedding, vectorSummaryEmbedding] =
      embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "titleEmbedding" = ${titleEmbedding}::vector,
        "summaryEmbedding" = ${summaryEmbedding}::vector,
        "detailedSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
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
