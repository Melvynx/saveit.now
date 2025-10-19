import { BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText } from "ai";
import { uploadBufferToS3 } from "../../aws-s3/aws-s3-upload-files";
import { capturePDFScreenshot } from "../../cloudflare/screenshot";
import { OPENAI_MODELS } from "../../openai";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  generateContentSummary,
  generateAndCreateTags,
  updateBookmarkWithMetadata,
} from "../process-bookmark.utils";
import {
  PDF_SUMMARY_PROMPT,
  PDF_TITLE_PROMPT,
  TAGS_PROMPT,
  USER_SUMMARY_PROMPT,
  VECTOR_SUMMARY_PROMPT,
} from "../prompt.const";

export async function processPDFBookmark(
  context: {
    bookmarkId: string;
    userId: string;
    url: string;
    content: unknown; // Content is not used since we download PDF directly
  },
  step: InngestStep,
  publish: InngestPublish,
): Promise<void> {
  // Upload PDF to S3 for persistent storage and get file size
  const { uploadedPdfUrl, fileSize } = await step.run(
    "upload-pdf-to-s3",
    async () => {
      // Download PDF content
      const response = await fetch(context.url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      const pdfContent = await response.arrayBuffer();

      // Upload to S3
      const fileName = `pdf-${context.bookmarkId}-${Date.now()}`;
      const buffer = Buffer.from(pdfContent);

      const uploadResult = await uploadBufferToS3({
        buffer,
        fileName,
        contentType: "application/pdf",
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
      });

      return {
        uploadedPdfUrl: uploadResult,
        fileSize: pdfContent.byteLength,
      };
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

  // Analyze PDF content using AI
  const pdfAnalysis = await step.run("analyze-pdf", async () => {
    // Download PDF content for analysis
    const response = await fetch(context.url);
    if (!response.ok) {
      throw new Error(
        `Failed to download PDF for analysis: ${response.statusText}`,
      );
    }
    const pdfContent = await response.arrayBuffer();

    const analysis = await generateText({
      model: OPENAI_MODELS.cheap,
      system: PDF_SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Here is the PDF file",
            },
            {
              type: "file",
              data: new Uint8Array(pdfContent),
              mediaType: "application/pdf",
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

  // Generate title from PDF analysis
  const title = await step.run("get-title", async () => {
    if (!pdfAnalysis) {
      return "PDF Document";
    }

    return await generateContentSummary(PDF_TITLE_PROMPT, pdfAnalysis);
  });

  // Generate summary
  const summary = await step.run("get-summary", async () => {
    return await generateContentSummary(USER_SUMMARY_PROMPT, pdfAnalysis);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 4,
    },
  });

  // Generate detailed summary for vector search
  const detailedSummary = await step.run("get-detailed-summary", async () => {
    return await generateContentSummary(VECTOR_SUMMARY_PROMPT, pdfAnalysis);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 5,
    },
  });

  // Generate AI tags
  const aiTags = await step.run("get-ai-tags", async () => {
    return await generateAndCreateTags(TAGS_PROMPT, pdfAnalysis, context.userId);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["screenshot"],
      order: 6,
    },
  });

  // Generate PDF screenshot/thumbnail
  const screenshotUrl = await step.run("generate-screenshot", async () => {
    try {
      const screenshotBuffer = await capturePDFScreenshot(context.url);
      const fileName = `pdf-screenshot-${context.bookmarkId}-${Date.now()}.png`;

      const uploadResult = await uploadBufferToS3({
        buffer: screenshotBuffer,
        fileName,
        contentType: "image/png",
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
      });

      return uploadResult;
    } catch (error) {
      console.error("Failed to generate PDF screenshot:", error);
      return null;
    }
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["saving"],
      order: 7,
    },
  });

  // Update bookmark with all extracted data
  await step.run("update-bookmark", async () => {
    await updateBookmarkWithMetadata({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.PDF,
      title,
      summary,
      vectorSummary: detailedSummary,
      imageDescription: pdfAnalysis,
      ogImageUrl: screenshotUrl,
      metadata: {
        pdfUrl: uploadedPdfUrl,
        originalUrl: context.url,
        fileSize,
        screenshotUrl,
      },
      tags: aiTags,
      status: "READY",
    });
  });

  // Update embeddings
  await step.run("update-embeddings", async () => {
    const { embeddings } = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [title, detailedSummary].filter(Boolean),
    });

    const [titleEmbedding, vectorSummaryEmbedding] =
      embeddings;

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
