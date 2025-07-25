import { BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText, tool } from "ai";
import { NonRetriableError } from "inngest";
import { getTweet } from "react-tweet/api";
import { z } from "zod";
import { uploadFileFromURLToS3 } from "../../aws-s3/aws-s3-upload-files";
import { GEMINI_MODELS } from "../../gemini";
import { OPENAI_MODELS } from "../../openai";
import { getImageUrlToBase64 } from "../bookmark.utils";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "../process-bookmark.utils";
import {
  IMAGE_ANALYSIS_PROMPT,
  TAGS_PROMPT,
  TWEET_SUMMARY_PROMPT,
  TWEET_VECTOR_SUMMARY_PROMPT,
} from "../prompt.const";

function getTweetId(url: string): string | undefined {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const tweetId = pathname.split("/").pop();
  return tweetId;
}

export async function processTweetBookmark(
  context: {
    bookmarkId: string;
    userId: string;
    url: string;
  },
  step: InngestStep,
  publish: InngestPublish,
): Promise<void> {
  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["get-tweet"],
      order: 3,
    },
  });

  const tweet = await step.run("get-tweet", async () => {
    const tweetId = getTweetId(context.url);

    if (!tweetId) {
      throw new NonRetriableError(`Tweet ID not found for ${context.url}`);
    }

    const tweet = await getTweet(tweetId);

    if (!tweet) {
      throw new NonRetriableError(`Tweet not found for ${context.url}`);
    }

    return { ...tweet, tweetId };
  });

  const data = {
    faviconUrl: tweet.user.profile_image_url_https,
    content: tweet.text,
    title: tweet.user.name,
    user: {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      profile_image_url_https: tweet.user.profile_image_url_https,
    },
    medias:
      tweet.mediaDetails?.map((media) => ({
        url: media.media_url_https,
        type: media.type,
      })) || [],
  };

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["describe-screenshot"],
      order: 4,
    },
  });

  const tweetImageDescription = await step.run(
    "get-tweet-image-description",
    async () => {
      if (!data.medias[0]) {
        return null;
      }

      const screenshotBase64 = await getImageUrlToBase64(data.medias[0].url);

      const result = await generateText({
        model: GEMINI_MODELS.cheap,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: IMAGE_ANALYSIS_PROMPT,
              },
              {
                type: "image",
                image: screenshotBase64,
              },
            ],
          },
        ],
        tools: {
          "invalid-image": tool({
            description: "The image is black, invalid, you see nothing on it.",
            parameters: z.object({
              reason: z.string(),
            }),
          }),
        },
        toolChoice: "auto",
      });

      if (result.toolCalls?.[0]?.toolName === "invalid-image") {
        return null;
      }

      return result.text;
    },
  );

  const userInput =
    data.content || tweetImageDescription
      ? `${
          data.content
            ? `Here is the content of the tweet :
<tweet-content>
${JSON.stringify(data)}
</tweet-content>`
            : null
        }
        ${
          tweetImageDescription
            ? `Here is the description of the screenshot :
<screenshot-description>
${tweetImageDescription}
</screenshot-description>`
            : null
        }`
      : null;

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 5,
    },
  });

  const summary = await step.run("get-summary", async () => {
    if (!userInput) {
      return "";
    }

    return await getAISummary(TWEET_SUMMARY_PROMPT, userInput);
  });

  const vectorSummary = await step.run("get-big-summary", async () => {
    if (!userInput) {
      return "";
    }

    return await getAISummary(TWEET_VECTOR_SUMMARY_PROMPT, userInput);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 6,
    },
  });

  const getTags = await step.run("get-tags", async () => {
    if (!vectorSummary) {
      return [];
    }

    return await getAITags(TAGS_PROMPT, vectorSummary, context.userId);
  });

  const images = await step.run("save-screenshot", async () => {
    const result = {} as {
      ogImageUrl?: string;
      faviconUrl?: string;
    };

    if (data.faviconUrl) {
      const faviconUrl = await uploadFileFromURLToS3({
        url: data.faviconUrl,
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "og-image",
      });

      // Vérifier si l'image OG est utilisable
      result.faviconUrl = faviconUrl ?? undefined;
    }

    return result;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["saving"],
      order: 7,
    },
  });

  await step.run("update-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.TWEET,
      title: data.title,
      vectorSummary: vectorSummary,
      summary: summary || "",
      preview: undefined,
      faviconUrl: images.faviconUrl,
      ogImageUrl: images.ogImageUrl,
      tags: getTags,
      imageDescription: tweetImageDescription,
      metadata: tweet,
    });
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["finish"],
      order: 8,
    },
  });

  await step.run("update-embedding", async () => {
    if (!vectorSummary || !summary) return;

    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [vectorSummary || ""],
    });
    const [vectorSummaryEmbedding] = embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "vectorSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
      WHERE id = ${context.bookmarkId}
    `;
  });
}
