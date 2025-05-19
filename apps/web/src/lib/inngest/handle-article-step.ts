import { BookmarkType } from "@/generated/prisma";
import mql from "@microlink/mql";
import { embedMany } from "ai";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import TurndownService from "turndown";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { MODELS } from "../openai";
import { prisma } from "../prisma";
import { InngestStep } from "./inngest.utils";
import {
  chunkMarkdown,
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";

export async function handleArticleStep(
  context: {
    bookmarkId: string;
    content: string;
    userId: string;
    url: string;
  },
  step: InngestStep
): Promise<void> {
  // Extract and convert article content to markdown
  const markdown = await step.run("extract-article-to-markdown", async () => {
    const $ = cheerio.load(context.content);

    // Remove unnecessary elements
    $(
      "script, style, link, meta, noscript, iframe, svg, nav, footer, header, aside, .ad, .ads, .advertisement, .banner"
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
    const summaryPrompt = `## Context:
You are creating a concise summary for an article that has been bookmarked.
This summary will help the user remember what the article is about and why it might be valuable.

## Goal
Create a summary that captures:
1. The main topic or thesis of the article
2. Key points or arguments presented
3. Any notable conclusions or insights
4. Why this article might be valuable to reference later

## Article Content
<markdown>
${markdown.substring(0, 4000)}${
      markdown.length > 4000 ? "... (content truncated)" : ""
    }
</markdown>

## Output Format
Write a concise summary (60-100 words) in plain text without any markdown formatting.
Start directly with the summary - don't begin with phrases like "This article is about..."
`;

    return await getAISummary(summaryPrompt);
  });

  // Generate tags specific to article content
  const getTags = await step.run("get-article-tags", async () => {
    const tagsPrompt = `## Context:
You're analyzing an article to extract relevant tags that will help with future searching and categorization.

## Goal
Generate tags that capture:
1. The main topic and subtopics
2. Key concepts discussed
3. Names of important people, organizations, products, or technologies mentioned
4. Field or industry the article relates to
5. Type of content (e.g., tutorial, opinion, research, news)

## Article Content
<markdown>
${markdown.substring(0, 4000)}${
      markdown.length > 4000 ? "... (content truncated)" : ""
    }
</markdown>

## Output Format
Generate 5-15 single-word tags that are most relevant to this article.
Each tag should be a single word without spaces.
Focus on specificity and relevance rather than generic terms.
`;

    return await getAITags(tagsPrompt, context.userId);
  });

  // Generate embeddings for searchable content
  const embedsContent = await step.run("embeds-article-content", async () => {
    const chunks = chunkMarkdown(markdown);

    const { embeddings } = await embedMany({
      model: MODELS.embedding,
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
      content: markdown,
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
