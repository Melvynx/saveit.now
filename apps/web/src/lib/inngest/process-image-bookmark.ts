import { BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText } from "ai";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { GEMINI_MODELS } from "../gemini";
import { OPENAI_MODELS } from "../openai";
import { InngestPublish, InngestStep } from "./inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "./process-bookmark.step";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";
import {
  IMAGE_SUMMARY_PROMPT,
  IMAGE_TITLE_PROMPT,
  TAGS_PROMPT,
} from "./prompt.const";

export async function handleImageStep(
  context: {
    bookmarkId: string;
    userId: string;
    url: string;
  },

  step: InngestStep,
  publish: InngestPublish,
): Promise<void> {
  // Convert ArrayBuffer to Base64 for OpenAI Vision API
  const base64Content = await step.run("get-base64-content", async () => {
    const response = await fetch(context.url);
    const arrayBuffer = await response.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString("base64");
    return base64Content;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["describe-screenshot"],
      order: 4,
    },
  });

  // Analyze the image using OpenAI Vision
  const imageAnalysis = await step.run("analyze-image", async () => {
    const analysis = await generateText({
      model: GEMINI_MODELS.cheap,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail. Describe what you see, including objects, people, colors, composition, style, and any text visible in the image.",
            },
            {
              type: "image",
              image: base64Content,
            },
          ],
        },
      ],
    });

    return analysis.text;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 5,
    },
  });

  const title = await step.run("get-title", async () => {
    if (!imageAnalysis) {
      return "";
    }

    return await getAISummary(IMAGE_TITLE_PROMPT, imageAnalysis);
  });

  // Generate a summary of the image
  const summary = await step.run("get-summary", async () => {
    return await getAISummary(IMAGE_SUMMARY_PROMPT, imageAnalysis);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 6,
    },
  });

  // Generate tags for the image
  const tags = await step.run("get-tags", async () => {
    return await getAITags(TAGS_PROMPT, context.userId, summary);
  });

  // Save the image to S3
  const saveImage = await step.run("save-image", async () => {
    const file = new File([base64Content], "image.png", {
      type: "image/png", // Assuming PNG, but this should be determined from the actual content type
    });

    const imageUrl = await uploadFileToS3({
      file: file,
      prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
      fileName: `preview.png`,
    });

    return imageUrl;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["saving"],
      order: 7,
    },
  });

  // Update the bookmark with the analysis, summary, tags, and image URL
  await step.run("update-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.IMAGE,
      title: title,
      summary: summary || "",
      preview: saveImage,
      tags: tags,
    });
  });

  await step.run("update-embedding", async () => {
    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [title, summary],
    });
    const [titleEmbedding, summaryEmbedding] = embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "titleEmbedding" = ${titleEmbedding}::vector,
        "summaryEmbedding" = ${summaryEmbedding}::vector
      WHERE id = ${context.bookmarkId}
    `;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["finish"],
      order: 8,
    },
  });
}
