import mql from "@microlink/mql";
import { BookmarkType, prisma } from "@workspace/database";
import { embedMany } from "ai";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import TurndownService from "turndown";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { OPENAI_MODELS } from "../openai";
import { InngestStep } from "./inngest.utils";
import {
  chunkMarkdown,
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";
import { TAGS_PROMPT, USER_SUMMARY_PROMPT } from "./prompt.const";

export async function handleArticleStep(
  context: {
    bookmarkId: string;
    content: string;
    userId: string;
    url: string;
  },
  step: InngestStep,
): Promise<void> {
  // Extract and convert article content to markdown
  const markdown = await step.run("extract-article-to-markdown", async () => {
    const $ = cheerio.load(context.content);

    // Remove unnecessary elements
    $(
      "script, style, link, meta, noscript, iframe, svg, nav, footer, header, aside, .ad, .ads, .advertisement, .banner",
    ).remove();

    // Extract just the article content
    const articleContent =
      $("article").html() || $("main").html() || $("body").html() || "";

    // Convert to markdown
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      strongDelimiter: "**",
    });

    // Add additional rules for better article formatting
    turndown.addRule("strikethrough", {
      filter: ["del", "s"],
      replacement: function (content) {
        return "~~" + content + "~~";
      },
    });

    const markdown = turndown.turndown(articleContent);
    return markdown.trim();
  });

  // Generate a summary focused on article content
  const getSummary = await step.run("get-article-summary", async () => {
    return await getAISummary(USER_SUMMARY_PROMPT, markdown);
  });

  // Generate tags specific to article content
  const getTags = await step.run("get-article-tags", async () => {
    return await getAITags(TAGS_PROMPT, context.userId, markdown);
  });

  // Generate embeddings for searchable content
  const embedsContent = await step.run("embeds-article-content", async () => {
    const chunks = chunkMarkdown(markdown);

    const { embeddings } = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: chunks,
    });

    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
      idx: index,
    }));

    // Insert chunks with vector embeddings
    for (const chunk of chunksWithEmbeddings) {
      const chunkId = nanoid(7);
      await prisma.$executeRaw`
        INSERT INTO "BookmarkChunk" ("id", "bookmarkId", "idx", "content", "embedding")
        VALUES (
          ${chunkId},
          ${context.bookmarkId},
          ${chunk.idx},
          ${chunk.content},
          ${chunk.embedding}::vector
        )
      `;
    }

    return chunksWithEmbeddings;
  });

  // Get screenshot of the article
  const screenshot = await step.run("get-article-screenshot", async () => {
    const { status, data } = await mql(context.url, {
      screenshot: true,
    });

    return data.screenshot?.url;
  });

  // Save the screenshot
  const saveScreenshot = await step.run("save-article-screenshot", async () => {
    if (!screenshot) {
      return;
    }

    const screenshotFile = await fetch(screenshot);
    const screenshotBuffer = await screenshotFile.arrayBuffer();
    const file = new File([screenshotBuffer], "screenshot.png", {
      type: "image/png",
    });

    const screenshotUrl = await uploadFileToS3({
      file: file,
      prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
      fileName: "article-screenshot.png",
    });

    return screenshotUrl;
  });

  // Extract article metadata
  const metadata = await step.run("extract-article-metadata", async () => {
    const $ = cheerio.load(context.content);

    // Extract metadata
    const title =
      $("meta[property='og:title']").attr("content") ||
      $("meta[name='twitter:title']").attr("content") ||
      $("title").text() ||
      "";

    const author =
      $("meta[name='author']").attr("content") ||
      $("meta[property='article:author']").attr("content") ||
      $(".author").first().text() ||
      "";

    const publishedDate =
      $("meta[property='article:published_time']").attr("content") ||
      $("time").attr("datetime") ||
      "";

    const estimatedReadTime = calculateReadTime(markdown);

    return {
      title,
      author,
      publishedDate,
      estimatedReadTime,
    };
  });

  // Update the bookmark with all article information
  await step.run("update-article-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.BLOG,
      title: metadata.title,
      // content: markdown,
      summary: getSummary || "",
      preview: saveScreenshot,
      metadata: metadata,
      tags: getTags,
    });
  });
}

/**
 * Estimates reading time for an article based on word count
 * @param text The article text
 * @returns Estimated reading time in minutes
 */
function calculateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  const readTimeMinutes = Math.ceil(wordCount / wordsPerMinute);
  return readTimeMinutes;
}
