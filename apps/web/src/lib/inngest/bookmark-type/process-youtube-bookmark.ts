import { BookmarkType, prisma } from "@workspace/database";
import { embedMany } from "ai";
import { ApifyClient } from "apify-client";
import { uploadFileToS3 } from "../../aws-s3/aws-s3-upload-files";
import { env } from "../../env";
import { OPENAI_MODELS } from "../../openai";
import { getServerUrl } from "../../server-url";
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

// Initialize the ApifyClient with API token
const client = new ApifyClient({
  token: env.APIFY_API_TOKEN,
});

function getVideoId(url: string): string {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1] || "";
}

async function scrapeYouTubeWithApify(url: string): Promise<{
  title: string;
  thumbnail: string;
  transcript?: string;
}> {
  const input = {
    customMapFunction: "(object) => { return {...object} }",
    duration: "all",
    features: "all",
    getTrending: false,
    includeShorts: false,
    maxItems: 1,
    sort: "r",
    startUrls: [url],
    uploadDate: "all",
  };
  const run = await client.actor("1p1aa7gcSydPkAE0d").call(input);

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log({ items });

  const data = items[0];

  if (!data) {
    throw new Error("No data returned from Apify YouTube scraper");
  }

  const videoData = data;

  // Extract transcript from captions if available
  let transcript = "";
  if (videoData.captions?.captionTracks?.length > 0) {
    const captionTrack = videoData.captions.captionTracks[0];
    if (captionTrack.baseUrl) {
      transcript = await fetchTranscriptFromUrl(captionTrack.baseUrl);
    }
  }

  return {
    title: videoData.title || "Untitled Video",
    thumbnail:
      videoData.thumbnailUrl ||
      `https://i.ytimg.com/vi/${getVideoId(url)}/maxresdefault.jpg`,
    transcript: transcript || undefined,
  };
}

async function fetchTranscriptFromUrl(baseUrl: string): Promise<string> {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return parseTranscriptXml(xmlText);
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return "";
  }
}

function parseTranscriptXml(xml: string): string {
  const results: Array<{ text: string; time: string }> = [];

  try {
    const textMatches = xml.match(
      /<text[^>]*start="([^"]*)"[^>]*>([^<]*)<\/text>/g,
    );

    if (textMatches) {
      for (const match of textMatches) {
        const startMatch = match.match(/start="([^"]*)"/);
        const textMatch = match.match(/>([^<]*)</);

        if (startMatch && textMatch && startMatch[1] && textMatch[1]) {
          const startTime = parseFloat(startMatch[1]);
          const text = textMatch[1];

          const minutes = Math.floor(startTime / 60);
          const seconds = Math.floor(startTime % 60);
          const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

          const decodedText = text
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          results.push({
            time: timeString,
            text: decodedText.trim(),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error parsing transcript XML:", error);
  }

  return results
    .filter((segment) => segment.time && segment.text)
    .map((segment) => `[${segment.time}] ${segment.text}`)
    .join("\n");
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

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["transcript-video"],
      order: 3,
    },
  });

  // Get video info including title, thumbnails, and other metadata using Apify
  const videoInfo = await step.run("get-video-info", async () => {
    const data = await scrapeYouTubeWithApify(context.url);
    return data;
  });

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
        console.error("Error saving thumbnail:", error);
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
    console.log({ userId: context.userId, summary });
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
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.YOUTUBE,
      title: videoInfo.title,
      summary: summary || "",
      preview: images.ogImageUrl,
      faviconUrl: `${getServerUrl()}/favicon/youtube.svg`,
      tags: tags,
      metadata: {
        youtubeId,
      },
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
      values: [videoInfo.title, summary, vectorSummary],
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
