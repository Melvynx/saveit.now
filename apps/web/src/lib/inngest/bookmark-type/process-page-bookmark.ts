import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText, tool } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { z } from "zod";
import { uploadFileFromURLToS3 } from "../../aws-s3/aws-s3-upload-files";
import { env } from "../../env";
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
  USER_SUMMARY_PROMPT,
  VECTOR_SUMMARY_PROMPT,
} from "../prompt.const";

export async function processStandardWebpage(
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

    // 3. Passe le <body> épuré à Turndown
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-", // cohérent avec GitHub
    });

    const markdown = turndown.turndown($("body").html() || "");

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
      const url = new URL(env.SCREENSHOT_WORKER_URL);
      url.searchParams.set("url", context.url);

      const screenshotUrl = await uploadFileFromURLToS3({
        url: url.toString(),
        prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "screenshot",
      });

      // Vérifier si la capture d'écran est utilisable (pas noire ou trop petite)
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

  const screenshotDescription = await step.run(
    "get-screenshot-description",
    async () => {
      if (!screenshotUrl) return null;

      const screenshotBase64 = await getImageUrlToBase64(screenshotUrl);

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
            description:
              "The image is black, invalid, you see nothing on it. Or it's just a captcha or invalid website image.",
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
    markdown || screenshotDescription
      ? `${
          markdown
            ? `Here is the content in markdown of the website :
<markdown-content>
${markdown}
</markdown-content>`
            : null
        }

${
  screenshotDescription
    ? `Here is the description of the screenshot :
<screenshot-description>
${screenshotDescription}
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

    return await getAISummary(USER_SUMMARY_PROMPT, userInput);
  });

  const vectorSummary = await step.run("get-big-summary", async () => {
    if (!userInput) {
      return "";
    }

    return await getAISummary(VECTOR_SUMMARY_PROMPT, userInput);
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

    return await getAITags(TAGS_PROMPT, vectorSummary, context.userId);
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
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.PAGE,
      title: pageMetadata.title,
      vectorSummary: vectorSummary,
      summary: summary || "",
      preview: screenshotDescription ? screenshot : images.ogImageUrl,
      faviconUrl: images.faviconUrl,
      ogImageUrl: images.ogImageUrl,
      tags: getTags,
      imageDescription:
        typeof screenshotDescription === "string"
          ? screenshotDescription
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
