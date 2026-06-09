import {
  captureToolUsage,
  fetchHtml,
  resolveUrl,
  toolErrorResponse,
} from "@/lib/tools/tool-route-utils";
import {
  extractContentRequestSchema,
  type ExtractContentResponse,
} from "@/lib/tools/schemas/extract-content";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";
import TurndownService from "@/lib/server-turndown";

function calculateReadingTime(wordCount: number) {
  return Math.ceil(wordCount / 225);
}

function extractTextFromHtml(html: string) {
  const $ = cheerio.load(html);
  $(
    "script, style, link, meta, noscript, iframe, svg, nav, header, footer, aside",
  ).remove();
  return $.text().replace(/\s+/g, " ").trim();
}

function countParagraphs(text: string) {
  return text
    .split(/\n\s*\n|\.\s+(?=[A-Z])/)
    .filter((paragraph) => paragraph.trim().length > 10).length;
}

export const Route = createFileRoute("/api/tools/extract-content")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = extractContentRequestSchema.parse(await request.json());
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);
          const baseUrl = new URL(url);

          $("script, style, link, meta, noscript, iframe, svg").remove();

          const articleHtml =
            $("article").html() ??
            $("main").html() ??
            $("[role='main']").html() ??
            $(".content, .post-content, .entry-content, .article-content")
              .first()
              .html() ??
            $("body").html() ??
            "";

          const turndown = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced",
            bulletListMarker: "-",
          });
          const markdown = turndown.turndown(articleHtml).trim();
          const plainText = extractTextFromHtml(articleHtml);
          const wordCount = plainText
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
          const title =
            $("meta[property='og:title']").attr("content") ??
            $("meta[name='twitter:title']").attr("content") ??
            $("h1").first().text() ??
            $("title").text() ??
            baseUrl.hostname;
          const faviconUrl =
            resolveUrl(
              baseUrl,
              $("link[rel='icon'][sizes='32x32']").attr("href") ??
                $("link[rel='shortcut icon']").attr("href") ??
                $("link[rel='icon']").attr("href") ??
                $("link[rel='apple-touch-icon']").attr("href"),
            ) ?? `${baseUrl.origin}/favicon.ico`;
          const result: ExtractContentResponse = {
            url,
            content: {
              title: title.trim(),
              plainText,
              markdown,
              statistics: {
                wordCount,
                charCount: plainText.length,
                paragraphCount: countParagraphs(plainText),
                readingTime: calculateReadingTime(wordCount),
              },
            },
            metadata: {
              title: title.trim(),
              description:
                $("meta[property='og:description']").attr("content")?.trim() ??
                $("meta[name='twitter:description']").attr("content")?.trim() ??
                $("meta[name='description']").attr("content")?.trim(),
              siteName:
                $("meta[property='og:site_name']").attr("content")?.trim() ??
                baseUrl.hostname,
              author:
                $("meta[name='author']").attr("content")?.trim() ??
                $("meta[property='article:author']").attr("content")?.trim() ??
                $("[rel='author']").text().trim() ??
                undefined,
              publishedDate:
                $("meta[property='article:published_time']")
                  .attr("content")
                  ?.trim() ??
                $("meta[name='date']").attr("content")?.trim() ??
                $("time[datetime]").attr("datetime")?.trim(),
              faviconUrl,
              ogImageUrl: resolveUrl(
                baseUrl,
                $("meta[property='og:image']").attr("content"),
              ),
            },
          };

          await captureToolUsage(request, "extract-content");
          return Response.json(result);
        } catch (error) {
          await captureToolUsage(request, "extract-content");
          return toolErrorResponse(error);
        }
      },
    },
  },
});
