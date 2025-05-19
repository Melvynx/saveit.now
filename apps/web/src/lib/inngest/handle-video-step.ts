import { BookmarkType } from "@/generated/prisma";
import mql from "@microlink/mql";
import { nanoid } from "nanoid";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { InngestStep } from "./inngest.utils";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";

export async function handleVideoStep(
  context: {
    bookmarkId: string;
    content: string;
    userId: string;
    url: string;
  },
  step: InngestStep
): Promise<void> {
  // Extract video platform and video ID
  const { platform, videoId } = await step.run(
    "identify-video-platform",
    async () => {
      return identifyVideoPlatform(context.url);
    }
  );

  // Attempt to get video metadata and transcript
  const { metadata, transcript } = await step.run(
    "get-video-metadata-transcript",
    async () => {
      return await getVideoMetadataAndTranscript(
        platform,
        videoId,
        context.url,
        context.content
      );
    }
  );

  // Generate a summary focused on video content
  const getSummary = await step.run("get-video-summary", async () => {
    let summaryPrompt;

    if (transcript) {
      // If we have a transcript, use it for a more detailed summary
      summaryPrompt = `## Context:
You are creating a concise summary for a video that has been bookmarked.
This summary will help the user remember what the video is about and why it might be valuable to watch.

## Video Information
Platform: ${platform}
Title: ${metadata.title || "Unknown"}
Creator: ${metadata.creator || "Unknown"}
Duration: ${metadata.duration || "Unknown"}

## Video Transcript (partial)
${transcript.substring(0, 4000)}${
        transcript.length > 4000 ? "... (transcript truncated)" : ""
      }

## Goal
Create a summary that captures:
1. The main topic or purpose of the video
2. Key points or insights presented
3. Why this video might be valuable to reference later

## Output Format
Write a concise summary (60-100 words) in plain text without any formatting.
Start directly with the summary - don't begin with phrases like "This video is about..."
`;
    } else {
      // If we don't have a transcript, create a summary based on metadata
      summaryPrompt = `## Context:
You are creating a concise summary for a video that has been bookmarked.
This summary will help the user remember what the video is about and why it might be valuable to watch.

## Video Information
Platform: ${platform}
Title: ${metadata.title || "Unknown"}
Creator: ${metadata.creator || "Unknown"}
Duration: ${metadata.duration || "Unknown"}
Description: ${metadata.description || "Not available"}

## Goal
Based on the limited information available, create a summary that:
1. Captures the likely topic or purpose of the video based on its title and description
2. Suggests why this video might be valuable to reference later
3. Notes that this is based on metadata only, not the full content

## Output Format
Write a concise summary (60-100 words) in plain text without any formatting.
Start directly with the summary - don't begin with phrases like "This video is about..."
`;
    }

    return await getAISummary(summaryPrompt);
  });

  // Generate tags specific to video content
  const getTags = await step.run("get-video-tags", async () => {
    let tagsPrompt;

    if (transcript) {
      // If we have a transcript, use it for more accurate tagging
      tagsPrompt = `## Context:
You're analyzing a video to extract relevant tags that will help with future searching and categorization.

## Video Information
Platform: ${platform}
Title: ${metadata.title || "Unknown"}
Creator: ${metadata.creator || "Unknown"}

## Video Transcript (partial)
${transcript.substring(0, 4000)}${
        transcript.length > 4000 ? "... (transcript truncated)" : ""
      }

## Goal
Generate tags that capture:
1. The main topic and subtopics of the video
2. Key concepts discussed
3. Names of important people, organizations, products, or technologies mentioned
4. Field or industry the video relates to
5. Type of content (e.g., tutorial, review, interview, presentation)
6. Include the platform (e.g., youtube, loom) as one of the tags

## Output Format
Generate 5-15 single-word tags that are most relevant to this video.
Each tag should be a single word without spaces.
Focus on specificity and relevance rather than generic terms.
Always include the platform name as one of the tags.
`;
    } else {
      // If we don't have a transcript, create tags based on metadata
      tagsPrompt = `## Context:
You're analyzing a video to extract relevant tags that will help with future searching and categorization.

## Video Information
Platform: ${platform}
Title: ${metadata.title || "Unknown"}
Creator: ${metadata.creator || "Unknown"}
Description: ${metadata.description || "Not available"}

## Goal
Based on the limited information available, generate tags that might capture:
1. The likely main topic of the video based on its title and description
2. The platform (e.g., youtube, loom)
3. The type of content it might be (e.g., tutorial, review)
4. Any key terms or technologies mentioned in the title or description

## Output Format
Generate 5-10 single-word tags that are most relevant to this video.
Each tag should be a single word without spaces.
Always include the platform name as one of the tags.
`;
    }

    return await getAITags(tagsPrompt, context.userId);
  });

  // Get video thumbnail
  const thumbnail = await step.run("get-video-thumbnail", async () => {
    // If we already have a thumbnail from metadata, use it
    if (metadata.thumbnail) {
      return metadata.thumbnail;
    }

    // Otherwise, get a screenshot
    try {
      const response = await mql(context.url, {
        screenshot: true,
      });

      return response.data.screenshot?.url;
    } catch (error) {
      console.error("Error getting video screenshot:", error);
      return null;
    }
  });

  // Save the thumbnail
  const saveThumbnail = await step.run("save-video-thumbnail", async () => {
    if (!thumbnail) {
      return null;
    }

    try {
      const thumbnailFile = await fetch(thumbnail);
      const thumbnailBuffer = await thumbnailFile.arrayBuffer();
      const file = new File([thumbnailBuffer], "thumbnail.png", {
        type: "image/png",
      });

      const thumbnailUrl = await uploadFileToS3({
        file: file,
        prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: `video-thumbnail-${nanoid(7)}.png`,
      });

      return thumbnailUrl;
    } catch (error) {
      console.error("Error saving video thumbnail:", error);
      return null;
    }
  });

  // Update the bookmark with all video information
  await step.run("update-video-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.VIDEO,
      content: transcript || "",
      summary: getSummary || "",
      preview: saveThumbnail,
      metadata: {
        ...metadata,
        platform,
        videoId,
        hasTranscript: !!transcript,
      },
      tags: getTags,
    });
  });
}

/**
 * Identifies the video platform and extracts the video ID from a URL
 * @param url The video URL
 * @returns Object containing platform and videoId
 */
function identifyVideoPlatform(url: string): {
  platform: string;
  videoId: string | null;
} {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();

  // YouTube
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    let videoId = null;

    if (hostname.includes("youtu.be")) {
      // Short YouTube URL format
      videoId = urlObj.pathname.substring(1);
    } else if (urlObj.pathname.includes("/watch")) {
      // Standard YouTube URL format
      videoId = urlObj.searchParams.get("v");
    } else if (urlObj.pathname.includes("/embed/")) {
      // Embedded YouTube URL format
      videoId = urlObj.pathname.split("/embed/")[1];
    } else if (urlObj.pathname.includes("/shorts/")) {
      // YouTube Shorts format
      videoId = urlObj.pathname.split("/shorts/")[1];
    }

    return { platform: "youtube", videoId };
  }

  // Vimeo
  if (hostname.includes("vimeo.com")) {
    const matches = urlObj.pathname.match(/\/(\d+)(?:\/|\?|$)/);
    const videoId = matches ? matches[1] : null;
    return { platform: "vimeo", videoId };
  }

  // Loom
  if (hostname.includes("loom.com")) {
    const matches = urlObj.pathname.match(
      /\/share\/([a-zA-Z0-9-]+)(?:\/|\?|$)/
    );
    const videoId = matches ? matches[1] : null;
    return { platform: "loom", videoId };
  }

  // Tella
  if (hostname.includes("tella.tv")) {
    const matches = urlObj.pathname.match(/\/([a-zA-Z0-9-]+)(?:\/|\?|$)/);
    const videoId = matches ? matches[1] : null;
    return { platform: "tella", videoId };
  }

  // Wistia
  if (hostname.includes("wistia.com") || url.includes("wistia.net")) {
    const matches = urlObj.pathname.match(
      /\/medias\/([a-zA-Z0-9-]+)(?:\/|\?|$)/
    );
    const videoId = matches ? matches[1] : null;
    return { platform: "wistia", videoId };
  }

  // Default - unknown platform
  return { platform: "unknown", videoId: null };
}

/**
 * Attempts to extract metadata and transcript from a video
 * @param platform The video platform
 * @param videoId The video ID
 * @param url The full video URL
 * @param content The raw content (if available)
 * @returns Object containing metadata and transcript
 */
async function getVideoMetadataAndTranscript(
  platform: string,
  videoId: string | null,
  url: string,
  content: string
): Promise<{ metadata: any; transcript: string | null }> {
  // Default empty metadata structure
  const defaultMetadata = {
    title: null,
    creator: null,
    duration: null,
    description: null,
    thumbnail: null,
    publishedDate: null,
  };

  // If we don't have a video ID, try to get metadata from Microlink
  if (!videoId) {
    try {
      const response = await mql(url);
      const data = response.data;

      return {
        metadata: {
          title: data?.title || null,
          creator: data?.author || null,
          duration: null,
          description: data?.description || null,
          thumbnail: data?.image?.url || null,
          publishedDate: data?.date || null,
        },
        transcript: null,
      };
    } catch (error) {
      console.error("Error getting metadata from Microlink:", error);
      return { metadata: defaultMetadata, transcript: null };
    }
  }

  // Platform-specific extraction
  switch (platform) {
    case "youtube":
      return await getYouTubeData(videoId);
    case "vimeo":
      return await getVimeoData(videoId);
    case "loom":
      return await getLoomData(videoId, url);
    case "tella":
      return await getTellaData(videoId, url);
    default:
      // For unknown platforms, try to get metadata from Microlink
      try {
        const response = await mql(url);
        const data = response.data;

        return {
          metadata: {
            title: data?.title || null,
            creator: data?.author || null,
            duration: null,
            description: data?.description || null,
            thumbnail: data?.image?.url || null,
            publishedDate: data?.date || null,
          },
          transcript: null,
        };
      } catch (error) {
        console.error("Error getting metadata from Microlink:", error);
        return { metadata: defaultMetadata, transcript: null };
      }
  }
}

/**
 * Extracts metadata and transcript from a YouTube video
 * @param videoId The YouTube video ID
 * @returns Object containing metadata and transcript
 */
async function getYouTubeData(
  videoId: string | null
): Promise<{ metadata: any; transcript: string | null }> {
  if (!videoId) {
    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: null,
        publishedDate: null,
      },
      transcript: null,
    };
  }

  try {
    // Get metadata using oEmbed API
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oEmbedResponse = await fetch(oEmbedUrl);
    const oEmbedData = await oEmbedResponse.json();

    // Get thumbnail
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // For YouTube, we can't easily get the transcript programmatically without using their API
    // which requires authentication. Instead, we'll use AI to generate a summary based on metadata.

    return {
      metadata: {
        title: oEmbedData.title || null,
        creator: oEmbedData.author_name || null,
        duration: null, // YouTube oEmbed doesn't provide duration
        description: null, // YouTube oEmbed doesn't provide description
        thumbnail: thumbnailUrl,
        publishedDate: null, // YouTube oEmbed doesn't provide published date
      },
      transcript: null,
    };
  } catch (error) {
    console.error("Error getting YouTube data:", error);

    // Fallback to basic metadata
    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        publishedDate: null,
      },
      transcript: null,
    };
  }
}

/**
 * Extracts metadata and transcript from a Vimeo video
 * @param videoId The Vimeo video ID
 * @returns Object containing metadata and transcript
 */
async function getVimeoData(
  videoId: string | null
): Promise<{ metadata: any; transcript: string | null }> {
  if (!videoId) {
    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: null,
        publishedDate: null,
      },
      transcript: null,
    };
  }

  try {
    // Get metadata using oEmbed API
    const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
    const oEmbedResponse = await fetch(oEmbedUrl);
    const oEmbedData = await oEmbedResponse.json();

    return {
      metadata: {
        title: oEmbedData.title || null,
        creator: oEmbedData.author_name || null,
        duration: oEmbedData.duration || null,
        description: oEmbedData.description || null,
        thumbnail: oEmbedData.thumbnail_url || null,
        publishedDate: null, // Vimeo oEmbed doesn't provide published date
      },
      transcript: null, // Vimeo doesn't provide easy access to transcripts
    };
  } catch (error) {
    console.error("Error getting Vimeo data:", error);

    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: null,
        publishedDate: null,
      },
      transcript: null,
    };
  }
}

/**
 * Extracts metadata and transcript from a Loom video
 * @param videoId The Loom video ID
 * @param url The full Loom URL
 * @returns Object containing metadata and transcript
 */
async function getLoomData(
  videoId: string | null,
  url: string
): Promise<{ metadata: any; transcript: string | null }> {
  try {
    // Get metadata using Microlink
    const response = await mql(url);
    const data = response.data;

    // Loom sometimes includes transcripts in the page, but we would need to
    // parse the HTML or use their API with authentication to get it reliably

    return {
      metadata: {
        title: data?.title || null,
        creator: data?.author || null,
        duration: null, // Microlink doesn't provide duration
        description: data?.description || null,
        thumbnail: data?.image?.url || null,
        publishedDate: data?.date || null,
      },
      transcript: null, // Would need Loom API access for this
    };
  } catch (error) {
    console.error("Error getting Loom data:", error);

    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: null,
        publishedDate: null,
      },
      transcript: null,
    };
  }
}

/**
 * Extracts metadata and transcript from a Tella video
 * @param videoId The Tella video ID
 * @param url The full Tella URL
 * @returns Object containing metadata and transcript
 */
async function getTellaData(
  videoId: string | null,
  url: string
): Promise<{ metadata: any; transcript: string | null }> {
  try {
    // Get metadata using Microlink
    const response = await mql(url);
    const data = response.data;

    return {
      metadata: {
        title: data?.title || null,
        creator: data?.author || null,
        duration: null, // Microlink doesn't provide duration
        description: data?.description || null,
        thumbnail: data?.image?.url || null,
        publishedDate: data?.date || null,
      },
      transcript: null, // Would need Tella API access for this
    };
  } catch (error) {
    console.error("Error getting Tella data:", error);

    return {
      metadata: {
        title: null,
        creator: null,
        duration: null,
        description: null,
        thumbnail: null,
        publishedDate: null,
      },
      transcript: null,
    };
  }
}
