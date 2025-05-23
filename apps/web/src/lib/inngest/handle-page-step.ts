import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateText } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { env } from "../env";
import { GEMINI_MODELS } from "../gemini";
import { OPENAI_MODELS } from "../openai";
import { getImageUrlToBase64 } from "./bookmark.utils";
import { InngestPublish, InngestStep } from "./inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "./process-bookmark.step";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";
import {
  IMAGE_ANALYSIS_PROMPT,
  TAGS_PROMPT,
  USER_SUMMARY_PROMPT,
  VECTOR_SUMMARY_PROMPT,
} from "./prompt.const";

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
      data: BOOKMARK_STEP_ID_TO_ID["screenshot"],
    },
  });

  const screenshot = await step.run("get-screenshot", async () => {
    if (context.bookmark.preview) return context.bookmark.preview;
    try {
      const url = new URL(env.SCREENSHOT_WORKER_URL);
      url.searchParams.set("url", context.url);
      const image = await fetch(url.toString());
      const imageBuffer = await image.arrayBuffer();
      const imageFile = new File([imageBuffer], "screenshot.png", {
        type: "image/png",
      });

      const screenshotUrl = await uploadFileToS3({
        file: imageFile,
        prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "screenshot",
      });

      return screenshotUrl;
    } catch {
      return null;
    }
  });

  const screenshotDescription = await step.run(
    "get-screenshot-description",
    async () => {
      if (!screenshot) return null;

      const screenshotBase64 = await getImageUrlToBase64(screenshot);

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
      });
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
      data: BOOKMARK_STEP_ID_TO_ID["extract-metadata"],
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
      data: BOOKMARK_STEP_ID_TO_ID["summary-page"],
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
      data: BOOKMARK_STEP_ID_TO_ID["find-tags"],
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

    if (pageMetadata.faviconUrl) {
      const fetchFavicon = await fetch(pageMetadata.faviconUrl);
      const faviconBuffer = await fetchFavicon.arrayBuffer();
      const faviconFile = new File([faviconBuffer], "favicon.png", {
        type: "image/png",
      });

      const faviconUrl = await uploadFileToS3({
        file: faviconFile,
        prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "favicon",
      });

      result.faviconUrl = faviconUrl;
    }

    return result;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      data: BOOKMARK_STEP_ID_TO_ID["saving"],
    },
  });

  await step.run("update-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.PAGE,
      title: pageMetadata.title,
      detailedSummary: vectorSummary,
      summary: summary || "",
      preview: screenshot,
      faviconUrl: images.faviconUrl,
      ogImageUrl: images.ogImageUrl,
      tags: getTags,
      imageDescription: screenshotDescription,
    });
  });

  await step.run("update-embedding", async () => {
    if (!vectorSummary || !summary || !pageMetadata.title) return;

    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [vectorSummary || "", summary || "", pageMetadata.title || ""],
    });
    const [titleEmbedding, summaryEmbedding, detailedSummaryEmbedding] =
      embedding.embeddings;

    // Update embeddings in database
    await prisma.$executeRaw`
      UPDATE "Bookmark"
      SET 
        "titleEmbedding" = ${titleEmbedding}::vector,
        "summaryEmbedding" = ${summaryEmbedding}::vector,
        "detailedSummaryEmbedding" = ${detailedSummaryEmbedding}::vector
      WHERE id = ${context.bookmarkId}
    `;
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      data: BOOKMARK_STEP_ID_TO_ID["finish"],
    },
  });
}
