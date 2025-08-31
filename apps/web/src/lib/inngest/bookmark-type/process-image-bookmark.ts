import { BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText } from "ai";
import sharp from "sharp";
import { uploadFileFromURLToS3 } from "../../aws-s3/aws-s3-upload-files";
import { GEMINI_MODELS } from "../../gemini";
import { OPENAI_MODELS } from "../../openai";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  generateContentSummary,
  generateAndCreateTags,
  updateBookmarkWithMetadata,
} from "../process-bookmark.utils";
import {
  IMAGE_SUMMARY_PROMPT,
  IMAGE_TITLE_PROMPT,
  TAGS_PROMPT,
} from "../prompt.const";

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
  const { base64Content, metadata } = await step.run(
    "get-base64-content",
    async () => {
      const response = await fetch(context.url);
      const buffer = await response.arrayBuffer();
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      const base64Content = Buffer.from(buffer).toString("base64");
      return { base64Content, metadata: { width, height } };
    },
  );

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["describe-screenshot"],
      order: 3,
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
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 4,
    },
  });

  const title = await step.run("get-title", async () => {
    if (!imageAnalysis) {
      return "";
    }

    return await generateContentSummary(IMAGE_TITLE_PROMPT, imageAnalysis);
  });

  // Generate a summary of the image
  const summary = await step.run("get-summary", async () => {
    return await generateContentSummary(IMAGE_SUMMARY_PROMPT, imageAnalysis);
  });

  // Generate vector summary for search
  const vectorSummary = await step.run("get-vector-summary", async () => {
    return await generateContentSummary(IMAGE_SUMMARY_PROMPT, imageAnalysis);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 5,
    },
  });

  // Generate tags for the image
  const tags = await step.run("get-tags", async () => {
    try {
      return await generateAndCreateTags(TAGS_PROMPT, summary, context.userId);
    } catch (error) {
      console.error(
        "Error generating tags for image bookmark",
        context.bookmarkId,
        error,
      );
      return null;
    }
  });

  // Save the image to S3
  const saveImage = await step.run("save-image", async () => {
    const imageUrl = await uploadFileFromURLToS3({
      url: context.url,
      prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
      fileName: `preview`,
    });

    return imageUrl;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["saving"],
      order: 6,
    },
  });

  // Update the bookmark with the analysis, summary, tags, and image URL
  await step.run("update-bookmark", async () => {
    await updateBookmarkWithMetadata({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.IMAGE,
      title: title,
      summary: summary || "",
      vectorSummary: vectorSummary || "",
      preview: saveImage,
      tags: tags ?? [],
      metadata: metadata,
    });
  });

  await step.run("update-embedding", async () => {
    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [title, vectorSummary],
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
      order: 7,
    },
  });
}
