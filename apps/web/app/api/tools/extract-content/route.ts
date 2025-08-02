import { SafeRouteError } from "@/lib/errors";
import { routeClient } from "@/lib/safe-route";
import { getPostHogClient } from "@/lib/posthog";
import { getPosthogId } from "@/lib/posthog-id";
import { ANALYTICS } from "@/lib/analytics";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { extractContentRequestSchema, type ExtractContentResponse } from "./extract-content.types";

function calculateReadingTime(wordCount: number): number {
  // Average reading speed is 200-250 words per minute
  // We'll use 225 words per minute
  const wordsPerMinute = 225;
  return Math.ceil(wordCount / wordsPerMinute);
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  // Remove unwanted elements
  $("script, style, link, meta, noscript, iframe, svg, nav, header, footer, aside").remove();
  return $.text().replace(/\s+/g, ' ').trim();
}

function countParagraphs(text: string): number {
  // Split by double newlines or periods followed by whitespace and capital letters
  const paragraphs = text.split(/\n\s*\n|\.\s+(?=[A-Z])/);
  return paragraphs.filter(p => p.trim().length > 10).length;
}

export const POST = routeClient
  .body(extractContentRequestSchema)
  .handler(async (req, { body }): Promise<ExtractContentResponse> => {
    const { url } = body;
    const posthog = getPostHogClient();
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const distinctId = getPosthogId(ip, userAgent);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new SafeRouteError("Failed to fetch the webpage", 400);
      }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements for content extraction
    $("script, style, link, meta, noscript, iframe, svg").remove();

    // Extract main content from semantic HTML elements
    const articleHtml =
      $("article").html() || 
      $("main").html() || 
      $("[role='main']").html() ||
      $(".content, .post-content, .entry-content, .article-content").first().html() ||
      $("body").html() || 
      "";

    // Configure TurndownService with the same settings as the bookmark processor
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    const markdown = turndown.turndown(articleHtml).trim();

    // Extract plain text from the cleaned HTML
    const plainText = extractTextFromHtml(articleHtml);

    // Calculate statistics
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = plainText.length;
    const paragraphCount = countParagraphs(plainText);
    const readingTime = calculateReadingTime(wordCount);

    // Extract metadata
    const title = 
      $("meta[property='og:title']").attr("content") ||
      $("meta[name='twitter:title']").attr("content") ||
      $("h1").first().text() ||
      $("title").text() ||
      new URL(url).hostname;

    const description = 
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='twitter:description']").attr("content") ||
      $("meta[name='description']").attr("content");

    const siteName = 
      $("meta[property='og:site_name']").attr("content") ||
      new URL(url).hostname;

    const author = 
      $("meta[name='author']").attr("content") ||
      $("meta[property='article:author']").attr("content") ||
      $("[rel='author']").text();

    const publishedDate = 
      $("meta[property='article:published_time']").attr("content") ||
      $("meta[name='date']").attr("content") ||
      $("time[datetime]").attr("datetime");

    // Find favicon
    const faviconSelectors = [
      "link[rel='icon'][sizes='32x32']",
      "link[rel='shortcut icon']",
      "link[rel='icon']",
      "link[rel='apple-touch-icon']",
    ];

    let faviconUrl = null;
    for (const selector of faviconSelectors) {
      const iconHref = $(selector).attr("href");
      if (iconHref) {
        faviconUrl = iconHref.startsWith("http")
          ? iconHref
          : `${new URL(url).origin}${iconHref}`;
        break;
      }
    }

    if (!faviconUrl) {
      faviconUrl = `${new URL(url).origin}/favicon.ico`;
    }

    const ogImageHref = $("meta[property='og:image']").attr("content");
    const ogImageUrl = ogImageHref
      ? ogImageHref.startsWith("http")
        ? ogImageHref
        : `${new URL(url).origin}${ogImageHref}`
      : null;

      const result = {
        url,
        content: {
          title: title.trim(),
          plainText,
          markdown,
          statistics: {
            wordCount,
            charCount,
            paragraphCount,
            readingTime,
          },
        },
        metadata: {
          title: title.trim(),
          description: description?.trim(),
          siteName: siteName?.trim(),
          author: author?.trim(),
          publishedDate: publishedDate?.trim(),
          faviconUrl,
          ogImageUrl: ogImageUrl || undefined,
        },
      };

      // Track tool usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-content",
        },
      });

      return result;
    } catch (error) {
      // Track tool usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-content",
        },
      });

      throw error;
    }
  });