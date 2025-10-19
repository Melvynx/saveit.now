import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { logger } from "../../logger";
import { embedMany } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import {
  uploadBufferToS3,
  uploadFileFromURLToS3,
} from "../../aws-s3/aws-s3-upload-files";
import { captureScreenshot } from "../../cloudflare/screenshot";
import { OPENAI_MODELS } from "../../openai";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  generateContentSummary,
  generateAndCreateTags,
  updateBookmarkWithMetadata,
} from "../process-bookmark.utils";
import {
  TAGS_PROMPT,
  USER_SUMMARY_PROMPT,
  VECTOR_SUMMARY_PROMPT,
} from "../prompt.const";
import { analyzeScreenshot } from "../screenshot-analysis.utils";

export async function processArticleBookmark(
  context: {
    bookmarkId: string;
    content: string;
    userId: string;
    url: string;
    bookmark: Bookmark;
  },
  step: InngestStep,
  publish: InngestPublish,
): Promise<void> {
  const markdown = await step.run("convert-to-markdown", async () => {
    const $ = cheerio.load(context.content);
    $("script, style, link, meta, noscript, iframe, svg").remove();

    // Extract article content from semantic HTML elements first
    const articleHtml =
      $("article").html() || $("main").html() || $("body").html() || "";

    // 3. Passe le contenu épuré à Turndown
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-", // cohérent avec GitHub
    });

    const markdown = turndown.turndown(articleHtml);

    return markdown.trim();
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["extract-metadata"],
      order: 3,
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
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["screenshot"],
      order: 4,
    },
  });

  const screenshot = await step.run("get-screenshot-v2", async () => {
    if (context.bookmark.preview) return context.bookmark.preview;
    try {
      const screenshotBuffer = await captureScreenshot({
        url: context.url,
        viewport: { width: 1920, height: 1080 },
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const screenshotUrl = await uploadBufferToS3({
        buffer: screenshotBuffer,
        fileName: "screenshot",
        contentType: "image/png",
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
      });

      if (!screenshotUrl) {
        return null;
      }

      return screenshotUrl;
    } catch {
      return null;
    }
  });

  const screenshotUrl = screenshot ?? pageMetadata.ogImageUrl;

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["describe-screenshot"],
      order: 5,
    },
  });

  const screenshotAnalysis = await step.run(
    "get-screenshot-description",
    async () => {
      const result = await analyzeScreenshot(screenshotUrl);
      
      if (result.isInvalid && result.invalidReason) {
        logger.debug(`Screenshot invalid for bookmark ${context.bookmarkId}: ${result.invalidReason}`);
      }
      
      return result;
    },
  );

  const userInput =
    markdown || screenshotAnalysis.description
      ? `${
          markdown
            ? `Here is the content in markdown of the website :
<markdown-content>
${markdown}
</markdown-content>`
            : null
        }

${
  screenshotAnalysis.description
    ? `Here is the description of the screenshot :
<screenshot-description>
${screenshotAnalysis.description}
</screenshot-description>`
    : null
}`
      : null;

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["summary-page"],
      order: 6,
    },
  });

  const summary = await step.run("get-summary", async () => {
    if (!userInput) {
      return "";
    }

    return await generateContentSummary(USER_SUMMARY_PROMPT, userInput);
  });

  const vectorSummary = await step.run("get-big-summary", async () => {
    if (!userInput) {
      return "";
    }

    return await generateContentSummary(VECTOR_SUMMARY_PROMPT, userInput);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["find-tags"],
      order: 7,
    },
  });

  const getTags = await step.run("get-tags", async () => {
    if (!vectorSummary) {
      return [];
    }

    return await generateAndCreateTags(TAGS_PROMPT, vectorSummary, context.userId);
  });

  const images = await step.run("save-screenshot", async () => {
    const result = {} as {
      ogImageUrl?: string;
      faviconUrl?: string;
    };

    if (pageMetadata.ogImageUrl) {
      const ogImageUrl = await uploadFileFromURLToS3({
        url: pageMetadata.ogImageUrl,
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "og-image",
      });

      // Vérifier si l'image OG est utilisable
      if (ogImageUrl) {
        result.ogImageUrl = ogImageUrl;
      }
    }

    if (pageMetadata.faviconUrl) {
      const faviconUrl = await uploadFileFromURLToS3({
        url: pageMetadata.faviconUrl,
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "favicon",
      });
      result.faviconUrl = faviconUrl || undefined;
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

  await step.run("update-bookmark", async () => {
    // Use og-image as fallback when screenshot is invalid
    const finalPreview = screenshotAnalysis.isInvalid 
      ? images.ogImageUrl 
      : (screenshotAnalysis.description ? screenshot : images.ogImageUrl);

    await updateBookmarkWithMetadata({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.ARTICLE,
      title: pageMetadata.title,
      vectorSummary: vectorSummary,
      summary: summary || "",
      preview: finalPreview,
      faviconUrl: images.faviconUrl,
      ogImageUrl: images.ogImageUrl,
      tags: getTags,
      metadata: { articleContent: markdown },
      imageDescription:
        typeof screenshotAnalysis.description === "string"
          ? screenshotAnalysis.description
          : null,
    });
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID["finish"],
      order: 9,
    },
  });

  await step.run("update-embedding", async () => {
    if (!vectorSummary || !summary || !pageMetadata.title) return;

    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [vectorSummary || "", pageMetadata.title || ""],
    });
    const [vectorSummaryEmbedding, titleEmbedding] =
      embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "titleEmbedding" = ${titleEmbedding}::vector,
        "vectorSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
      WHERE id = ${context.bookmarkId}
    `;
  });
}
