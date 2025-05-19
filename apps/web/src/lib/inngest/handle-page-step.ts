import mql from "@microlink/mql";
import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { embedMany } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { MODELS } from "../openai";
import { InngestPublish, InngestStep } from "./inngest.utils";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";

export async function handlePageStep(
  context: {
    bookmarkId: string;
    content: string;
    userId: string;
    url: string;
    bookmark: Bookmark;
  },
  step: InngestStep,
  publish: InngestPublish
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
      data: "Extract metadata",
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
      data: "Summary the page",
    },
  });

  const summary = await step.run("get-summary", async () => {
    if (!markdown) {
      return "";
    }

    const summaryPrompt = `## Context:
You need to create the smallest resume for a entire webpage in a markdown format.
This resume is name a "bookmark resume" and will be used to help the user understand what is inside the page.

## Goal
The summary must help our service to search inside the page.
The summary should ne explain WHAT is inside the page, but the purpose of the page.
Question to think about :
* What the page is about ? Landing page, capture page, testimonials page, etc...
* What for ? Selling a product, getting a lead, etc...
* What is the main idea ?

## Data
<markdown>
${markdown}
</markdown>

## Output
PLAIN TEXT without any formatting, just the text that summary the web page.
Do not start with "This page is about..." just start with the summary.
It should be 2-3 sentences maximum.
`;

    return await getAISummary(summaryPrompt);
  });

  const bigSummary = await step.run("get-big-summary", async () => {
    if (!markdown) {
      return "";
    }

    const summaryPrompt = `## Context:
You need to create a precise summary about the purpose of this page. This summary will be used to me embeded and use vector databasae to search on it.
It will not be show to the user.
You will need to make a summary of a content of a webpage. In this summary, use important keywords and phrases that you find on the website.

## Goal
The summary must help our service to search inside the page.
The summary should ne explain WHAT is inside the page, but the purpose of the page.
Question to think about :
* What the page is about ? Landing page, capture page, testimonials page, etc...
* What for ? Selling a product, getting a lead, etc...
* What is the main idea ?
* What the user need to find later on this page ?

## Data
<markdown>
${markdown}
</markdown>

## Output
PLAIN TEXT without any formatting, just the text that summary the web page.
Do not start with "This page is about..." just start with the summary.
`;

    return await getAISummary(summaryPrompt);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      data: "Find relevant tags",
    },
  });

  const getTags = await step.run("get-tags", async () => {
    if (!markdown) {
      return [];
    }

    const tagsPrompt = `## Context:
You need to define every applicable tags for the entire webpage I will give you. The tags must include specific keywords like product name, product utility, page utility, etc...
The tags must be in a array of string format.
You should add as much useful tags as possible to simplify the search inside our bookmark data.
The tags should me full world like :

* product
* ai
* chatgpt
* prisma
* tools
* etc...

Prioritize tags by adding only between 5 to 15 tags maximum. Only add relevant tags for our search.

## Data
<markdown>
${markdown}
</markdown>

## Output

* Only add relevant tags. Between 5 and 15 tags. Only the most important.
* All the tags is IN LOWERCASE (ALWAYS)

`;

    return await getAITags(tagsPrompt, context.userId);
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "status",
    data: {
      data: "Taking screenshot",
    },
  });

  const screenshot = await step.run("get-screenshot", async () => {
    if (context.bookmark.preview) return null;
    try {
      const { status, data } = await mql(context.url, {
        screenshot: true,
      });

      return data.screenshot?.url;
    } catch {
      // else fetch the og-image directely with fetch
      const ogImage = await fetch(context.url);
      const html = await ogImage.text();
      const $ = cheerio.load(html);
      const ogImageUrl = $("meta[property='og:image']").attr("content");

      return ogImageUrl;
    }
  });

  const images = await step.run("save-screenshot", async () => {
    const result = {} as {
      screenshotUrl?: string;
      ogImageUrl?: string;
      faviconUrl?: string;
    };

    if (screenshot) {
      const screenshotFile = await fetch(screenshot);
      const screenshotBuffer = await screenshotFile.arrayBuffer();
      const file = new File([screenshotBuffer], "screenshot.png", {
        type: "image/png",
      });

      const screenshotUrl = await uploadFileToS3({
        file: file,
        prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
        fileName: "screenshot",
      });

      result.screenshotUrl = screenshotUrl;
    }

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
      data: "Saving...",
    },
  });

  await step.run("update-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.PAGE,
      title: pageMetadata.title,
      detailedSummary: bigSummary,
      summary: summary || "",
      preview: images?.screenshotUrl,
      faviconUrl: pageMetadata.faviconUrl,
      ogImageUrl: pageMetadata.ogImageUrl,
      tags: getTags,
    });
  });

  await step.run("update-embedding", async () => {
    const embedding = await embedMany({
      model: MODELS.embedding,
      values: [bigSummary || "", summary || "", pageMetadata.title || ""],
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
      data: "Finished",
    },
  });
}
