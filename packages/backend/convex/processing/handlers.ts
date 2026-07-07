"use node";

/**
 * Type-handler functions for bookmark processing.
 * Each handler is a plain async function (NOT a Convex function) called from pipeline.ts.
 * They receive an ActionCtx + bookmark data + userId, and return the fields to persist.
 */

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";
// @ts-ignore — turndown has no official TS types in this runtime
import TurndownService from "turndown";
import { imageSize } from "image-size";
import { getTweet } from "react-tweet/api";
import {
  generateSummary,
  GEMINI_MODEL_IDS,
  TAGS_PROMPT,
  TWEET_SUMMARY_PROMPT,
  TWEET_VECTOR_SUMMARY_PROMPT,
  YOUTUBE_SUMMARY_PROMPT,
  YOUTUBE_VECTOR_SUMMARY_PROMPT,
  YOUTUBE_THUMBNAIL_ANALYSIS_PROMPT,
  YOUTUBE_NO_TRANSCRIPT_SUMMARY_PROMPT,
  YOUTUBE_NO_TRANSCRIPT_VECTOR_SUMMARY_PROMPT,
  USER_SUMMARY_PROMPT,
  VECTOR_SUMMARY_PROMPT,
  IMAGE_TITLE_PROMPT,
  IMAGE_SUMMARY_PROMPT,
  PDF_SUMMARY_PROMPT,
  PDF_TITLE_PROMPT,
  PRODUCT_DISPLAY_SUMMARY_PROMPT,
  PRODUCT_SEARCH_SUMMARY_PROMPT,
} from "./gemini";
import {
  analyzeScreenshot,
  analyzeScreenshotWithPrompt,
  analyzeScreenshotBuffer,
  isScreenshotUrlValid,
} from "./screenshot";
import { embedDocument, EMBEDDING_MODEL_KEY } from "./embeddings";
import { withGeminiFallback } from "../lib/gemini_provider";
import { safeFetch } from "../lib/safe_fetch";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function generateContentSummary(
  systemPrompt: string,
  prompt: string,
): Promise<string> {
  return generateSummary(systemPrompt, prompt);
}

async function generateAndCreateTagNames(
  ctx: ActionCtx,
  systemPrompt: string,
  prompt: string,
  userId: string,
): Promise<string[]> {
  // Fetch existing user tags (bounded by user index)
  const existingTags = (await ctx.runQuery(
    internal.tags.queries.list_internal_for_processing,
    { userId },
  )) as Array<{ name: string }>;

  const existingTagNames = existingTags.map((t) => t.name);

  const enhancedSystemPrompt =
    existingTagNames.length > 0
      ? `${systemPrompt}\n\nExisting user tags: ${existingTagNames.join(", ")}\nPrioritize reusing these existing tags when appropriate before creating new ones.`
      : systemPrompt;

  const result = await withGeminiFallback((google) =>
    generateObject({
      model: google(GEMINI_MODEL_IDS.cheap),
      system: enhancedSystemPrompt,
      prompt,
      schema: z.object({ tags: z.array(z.string()) }),
    }),
  );

  return (result.object as { tags?: string[] }).tags ?? [];
}

function getTweetId(url: string): string | undefined {
  const urlObj = new URL(url);
  return urlObj.pathname.split("/").pop();
}

export function getVideoId(url: string): string {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1] || "";
}

function extractPageMetadata(
  html: string,
  url: string,
): {
  title: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogDescription: string | null;
} {
  const $ = cheerio.load(html);

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("meta[name='twitter:title']").attr("content") ||
    $("title").text() ||
    new URL(url).hostname;

  const faviconSelectors = [
    "link[rel='icon'][sizes='32x32']",
    "link[rel='shortcut icon']",
    "link[rel='icon']",
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];

  let faviconUrl: string | null = null;
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

  const ogDescription =
    $("meta[property='og:description']").attr("content") || null;

  return { title: title.trim(), faviconUrl, ogImageUrl, ogDescription };
}

async function uploadFromUrl(
  ctx: ActionCtx,
  srcUrl: string,
  key: string,
): Promise<string | null> {
  return ctx.runAction(internal.files.actions.uploadFileFromURL, {
    url: srcUrl,
    key,
  });
}

async function uploadBuffer(
  ctx: ActionCtx,
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  return ctx.runAction(internal.files.actions.uploadBuffer, {
    buffer: buffer.buffer as ArrayBuffer,
    key,
    contentType,
  });
}

// Result shape for all handlers
export type HandlerResult = Record<string, unknown>;

// ---------------------------------------------------------------------------
// processTweetBookmark
// ---------------------------------------------------------------------------

export async function processTweetBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;
  const tweetId = getTweetId(bookmark.url);
  if (!tweetId) throw new Error(`Tweet ID not found for ${bookmark.url}`);

  const tweetData = await getTweet(tweetId);
  if (!tweetData) throw new Error(`Tweet not found for ${bookmark.url}`);

  const tweet = { ...tweetData, tweetId };
  const tweetRecord = tweet as Record<string, any>;

  const data = {
    faviconUrl: tweet.user.profile_image_url_https,
    content: tweet.text,
    title: tweet.user.name,
    user: {
      name: tweet.user.name,
      screen_name: tweet.user.screen_name,
      profile_image_url_https: tweet.user.profile_image_url_https,
    },
    medias:
      tweet.mediaDetails?.map(
        (media: { media_url_https: string; type: string }) => ({
          url: media.media_url_https,
          type: media.type,
        }),
      ) ?? [],
  };

  // Analyze tweet image if present
  let tweetImageDescription: string | null = null;
  if (data.medias[0]) {
    const analysis = await analyzeScreenshot(data.medias[0].url);
    if (!analysis.isInvalid) {
      tweetImageDescription = analysis.description;
    }
  }

  const userInput =
    data.content || tweetImageDescription
      ? `${
          data.content
            ? `Here is the content of the tweet :
<tweet-content>
${JSON.stringify(data)}
</tweet-content>`
            : ""
        }
        ${
          tweetImageDescription
            ? `Here is the description of the screenshot :
<screenshot-description>
${tweetImageDescription}
</screenshot-description>`
            : ""
        }`
      : null;

  let summary = "";
  let vectorSummary = "";

  if (userInput) {
    summary = await generateContentSummary(TWEET_SUMMARY_PROMPT, userInput);
    vectorSummary = await generateContentSummary(
      TWEET_VECTOR_SUMMARY_PROMPT,
      userInput,
    );
  }

  const tagNames = vectorSummary
    ? await generateAndCreateTagNames(ctx, TAGS_PROMPT, vectorSummary, userId)
    : [];

  // Upload avatar/favicon to R2
  let faviconUrl: string | null | undefined;
  if (data.faviconUrl) {
    faviconUrl = await uploadFromUrl(
      ctx,
      data.faviconUrl,
      `users/${userId}/bookmarks/${bookmarkId}/og-image.jpg`,
    );
  }

  // Embed
  let searchEmbedding: number[] | undefined;
  if (vectorSummary || summary) {
    const text = vectorSummary
      ? data.title + "\n" + vectorSummary
      : data.title;
    searchEmbedding = await embedDocument(text);
  }

  return {
    type: "TWEET",
    title: data.title,
    summary,
    vectorSummary,
    faviconUrl: faviconUrl ?? undefined,
    ogImageUrl: undefined,
    preview: undefined,
    imageDescription: tweetImageDescription,
    metadata: {
      tweetId,
      id_str: tweetRecord.id_str,
      created_at: tweetRecord.created_at,
      favorite_count: tweetRecord.favorite_count,
      conversation_count: tweetRecord.conversation_count,
      reply_count: tweetRecord.reply_count,
      retweet_count: tweetRecord.retweet_count,
      user: {
        name: tweet.user.name,
        screen_name: tweet.user.screen_name,
        profile_image_url_https: tweet.user.profile_image_url_https,
      },
      mediaDetails: data.medias.map((media) => ({
        media_url_https: media.url,
        type: media.type,
      })),
    },
    tagNames,
    searchEmbedding,
    embeddingModel: searchEmbedding ? EMBEDDING_MODEL_KEY : undefined,
  };
}

// ---------------------------------------------------------------------------
// processYouTubeBookmark
// ---------------------------------------------------------------------------

export async function processYouTubeBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;
  const youtubeId = getVideoId(bookmark.url);

  // Fetch metadata via internal action
  const videoInfo = await ctx.runAction(
    internal.processing.youtube.fetchYouTubeMetadata,
    { videoId: youtubeId },
  ) as { title: string; thumbnail: string; transcript?: string };

  const transcript = videoInfo.transcript;
  const transcriptSource = videoInfo.transcript ? "api" : "none";

  // Thumbnail fallback analysis if no transcript
  let thumbnailAnalysis: string | null = null;
  if (!transcript) {
    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    try {
      const testFetch = await fetch(thumbnailUrl, { method: "HEAD" });
      const finalThumbnailUrl = testFetch.ok
        ? thumbnailUrl
        : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      const result = await analyzeScreenshotWithPrompt(
        finalThumbnailUrl,
        YOUTUBE_THUMBNAIL_ANALYSIS_PROMPT,
      );
      if (!result.isInvalid && result.description) {
        thumbnailAnalysis = result.description;
      }
    } catch {
      // ignore
    }
  }

  // Summary generation
  let summary = "";
  let vectorSummary = "";

  if (transcript) {
    summary = await generateContentSummary(
      YOUTUBE_SUMMARY_PROMPT,
      `<title>${videoInfo.title}</title><transcript>${transcript}</transcript>`,
    );
    vectorSummary = await generateContentSummary(
      YOUTUBE_VECTOR_SUMMARY_PROMPT,
      `<title>${videoInfo.title}</title><transcript>${transcript}</transcript>`,
    );
  } else if (thumbnailAnalysis) {
    summary = await generateContentSummary(
      YOUTUBE_NO_TRANSCRIPT_SUMMARY_PROMPT,
      `<title>${videoInfo.title}</title><thumbnail_description>${thumbnailAnalysis}</thumbnail_description>`,
    );
    vectorSummary = await generateContentSummary(
      YOUTUBE_NO_TRANSCRIPT_VECTOR_SUMMARY_PROMPT,
      `<title>${videoInfo.title}</title><thumbnail_description>${thumbnailAnalysis}</thumbnail_description>`,
    );
  }

  // Tags use summary (not vectorSummary) for YouTube
  const tagNames = await generateAndCreateTagNames(
    ctx,
    TAGS_PROMPT,
    summary || videoInfo.title,
    userId,
  );

  // Upload thumbnail to R2
  let ogImageUrl: string | null = null;
  if (videoInfo.thumbnail) {
    try {
      const response = await fetch(videoInfo.thumbnail);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      ogImageUrl = await uploadBuffer(
        ctx,
        buffer,
        `users/${userId}/bookmarks/${bookmarkId}/og-image.jpg`,
        "image/jpeg",
      );
    } catch {
      // ignore thumbnail upload failure
    }
  }

  const siteUrl = process.env.SITE_URL ?? "";
  const faviconUrl = `${siteUrl}/favicon/youtube.svg`;

  // Build final metadata
  const existingMeta =
    bookmark.metadata && typeof bookmark.metadata === "object"
      ? (bookmark.metadata as Record<string, unknown>)
      : {};

  const finalMetadata: Record<string, unknown> = {
    ...existingMeta,
    youtubeId,
    transcriptAvailable: !!transcript,
    transcriptSource,
    transcriptCharacterCount: transcript?.length ?? 0,
  };
  if (transcript) {
    finalMetadata.transcriptExtractedAt = new Date().toISOString();
    finalMetadata.summarySource = "transcript";
  } else if (thumbnailAnalysis) {
    finalMetadata.thumbnailAnalyzed = true;
    finalMetadata.summarySource = "thumbnail";
  } else {
    finalMetadata.summarySource = "none";
  }

  // Embed
  const embedText = vectorSummary
    ? videoInfo.title + "\n" + vectorSummary
    : videoInfo.title;
  const searchEmbedding = await embedDocument(embedText);

  return {
    type: "YOUTUBE",
    title: videoInfo.title,
    summary,
    vectorSummary,
    preview: ogImageUrl,
    faviconUrl,
    ogImageUrl,
    metadata: finalMetadata,
    tagNames,
    searchEmbedding,
    embeddingModel: EMBEDDING_MODEL_KEY,
  };
}

// ---------------------------------------------------------------------------
// processArticleBookmark
// ---------------------------------------------------------------------------

export async function processArticleBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    preview?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
  htmlContent: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;

  const $ = cheerio.load(htmlContent);
  $("script, style, link, meta, noscript, iframe, svg").remove();
  const articleHtml =
    $("article").html() || $("main").html() || $("body").html() || "";

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  const markdown = turndown.turndown(articleHtml).trim();

  const pageMetadata = extractPageMetadata(htmlContent, bookmark.url);

  // Screenshot
  let screenshotUrl: string | null = null;
  let screenshotAnalysis = {
    description: null as string | null,
    isInvalid: false,
    invalidReason: null as string | null,
  };

  if (bookmark.preview) {
    screenshotUrl = bookmark.preview;
  } else {
    try {
      const screenshotCdnUrl = await ctx.runAction(
        internal.processing.screenshot.captureAndUploadScreenshot,
        { url: bookmark.url, userId, bookmarkId: bookmark._id as never },
      ) as string | null;
      if (screenshotCdnUrl) {
        // Analyze via Gemini to check validity
        const response = await fetch(screenshotCdnUrl);
        const ab = await response.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length >= 1000) {
          screenshotAnalysis = await analyzeScreenshotBuffer(buf);
          if (!screenshotAnalysis.isInvalid) {
            screenshotUrl = screenshotCdnUrl;
          }
        }
      }
    } catch {
      // Fallback: check if bookmark.preview was set since we started
      if (bookmark.preview) {
        const valid = await isScreenshotUrlValid(bookmark.preview);
        if (valid) screenshotUrl = bookmark.preview;
      }
    }
  }

  const screenshotOrOg = screenshotUrl ?? pageMetadata.ogImageUrl;
  if (!screenshotAnalysis.description && screenshotOrOg) {
    screenshotAnalysis = await analyzeScreenshot(screenshotOrOg);
  }

  const userInput =
    markdown || screenshotAnalysis.description
      ? `${
          markdown
            ? `Here is the content in markdown of the website :
<markdown-content>
${markdown}
</markdown-content>`
            : ""
        }

${
  screenshotAnalysis.description
    ? `Here is the description of the screenshot :
<screenshot-description>
${screenshotAnalysis.description}
</screenshot-description>`
    : ""
}`
      : null;

  let summary = "";
  let vectorSummary = "";
  if (userInput) {
    summary = await generateContentSummary(USER_SUMMARY_PROMPT, userInput);
    vectorSummary = await generateContentSummary(
      VECTOR_SUMMARY_PROMPT,
      userInput,
    );
  }

  const tagNames = vectorSummary
    ? await generateAndCreateTagNames(ctx, TAGS_PROMPT, vectorSummary, userId)
    : [];

  // R2 uploads
  let uploadedOgImageUrl: string | null = null;
  let uploadedFaviconUrl: string | null = null;

  if (pageMetadata.ogImageUrl) {
    uploadedOgImageUrl = await uploadFromUrl(
      ctx,
      pageMetadata.ogImageUrl,
      `users/${userId}/bookmarks/${bookmarkId}/og-image.jpg`,
    );
  }
  if (pageMetadata.faviconUrl) {
    uploadedFaviconUrl = await uploadFromUrl(
      ctx,
      pageMetadata.faviconUrl,
      `users/${userId}/bookmarks/${bookmarkId}/favicon.ico`,
    );
  }

  // screenshotUrl is only set when the capture was analyzed as valid; if it
  // is missing or flagged invalid, fall back to the uploaded OG image.
  const finalPreview = screenshotAnalysis.isInvalid
    ? uploadedOgImageUrl
    : (screenshotUrl ?? uploadedOgImageUrl);

  // Embed
  let searchEmbedding: number[] | undefined;
  if (pageMetadata.title || vectorSummary) {
    const text = vectorSummary
      ? pageMetadata.title + "\n" + vectorSummary
      : pageMetadata.title;
    searchEmbedding = await embedDocument(text);
  }

  return {
    type: "ARTICLE",
    title: pageMetadata.title,
    summary,
    vectorSummary,
    preview: finalPreview,
    faviconUrl: uploadedFaviconUrl,
    ogImageUrl: uploadedOgImageUrl,
    ogDescription: pageMetadata.ogDescription,
    imageDescription:
      typeof screenshotAnalysis.description === "string"
        ? screenshotAnalysis.description
        : null,
    metadata: {
      contentExtracted: markdown.length > 0,
      contentCharacterCount: markdown.length,
      summarySource: markdown ? "article" : "screenshot",
    },
    tagNames,
    searchEmbedding,
    embeddingModel: searchEmbedding ? EMBEDDING_MODEL_KEY : undefined,
  };
}

// ---------------------------------------------------------------------------
// processProductBookmark
// ---------------------------------------------------------------------------

interface ProductMetadata {
  name?: string;
  price?: number;
  currency?: string;
  brand?: string;
  image?: string;
  availability?: string;
  description?: string;
  category?: string;
}

interface BasicMetadata {
  title?: string;
  description?: string;
  image?: string;
  url: string;
}

export function isProductPage(url: string, html: string): boolean {
  const $ = cheerio.load(html);

  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (const script of jsonLdScripts.toArray()) {
    try {
      const content = $(script).html();
      if (!content) continue;
      const jsonLd = JSON.parse(content);
      if (
        jsonLd["@type"] === "Product" ||
        jsonLd.mainEntity?.["@type"] === "Product"
      ) {
        return true;
      }
    } catch {
      // continue
    }
  }

  if ($('meta[property="og:type"]').attr("content") === "product") {
    return true;
  }

  const isEcommerceUrl =
    /\/(product|item|p)\/|\/products\/|\/shop\/|\/buy\//.test(url);
  const hasPrice = /price|cost|\$|€|£|¥|\d+\.\d{2}/.test(html.toLowerCase());

  if (isEcommerceUrl && hasPrice) return true;

  const hasEcommercePlatform =
    html.includes("Shopify") ||
    html.includes("WooCommerce") ||
    (html.includes("product") && html.includes("cart"));

  return isEcommerceUrl && hasEcommercePlatform;
}

function extractBasicMetadata(html: string, url: string): BasicMetadata {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $('meta[name="title"]').attr("content") ||
    $("h1").first().text() ||
    $("title").text() ||
    "";

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  let image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $("img").first().attr("src") ||
    "";

  if (image && !image.startsWith("http")) {
    const baseUrl = new URL(url);
    image = image.startsWith("/")
      ? `${baseUrl.origin}${image}`
      : `${baseUrl.origin}/${image}`;
  }

  return { title: title.trim(), description: description.trim(), image, url };
}

function extractProductMetadataFromHtml(html: string): ProductMetadata {
  const $ = cheerio.load(html);

  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (const script of jsonLdScripts.toArray()) {
    try {
      const content = $(script).html();
      if (!content) continue;
      const jsonLd = JSON.parse(content);
      const product =
        jsonLd["@type"] === "Product" ? jsonLd : jsonLd.mainEntity;
      if (product?.["@type"] === "Product") {
        return {
          name: product.name,
          price: product.offers?.price || product.price,
          currency: product.offers?.priceCurrency || "USD",
          brand: product.brand?.name || product.brand,
          image: Array.isArray(product.image)
            ? product.image[0]
            : product.image,
          availability: product.offers?.availability,
          description: product.description,
        };
      }
    } catch {
      // continue
    }
  }

  const ogProduct: ProductMetadata = {
    name: $('meta[property="og:title"]').attr("content"),
    price:
      parseFloat(
        $('meta[property="product:price:amount"]').attr("content") || "0",
      ) || undefined,
    currency:
      $('meta[property="product:price:currency"]').attr("content") || "USD",
    brand: $('meta[property="product:brand"]').attr("content"),
    image: $('meta[property="og:image"]').attr("content"),
    availability: $('meta[property="product:availability"]').attr("content"),
    description: $('meta[property="og:description"]').attr("content"),
  };

  if (ogProduct.price && ogProduct.price > 0) return ogProduct;

  const scripts = $("script:not([src])")
    .map((_i, el) => $(el).html())
    .get();
  for (const script of scripts) {
    if (script && script.includes("product")) {
      const shopifyProductMatch = script.match(
        /"product"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/i,
      );
      if (shopifyProductMatch?.[1]) {
        try {
          const productData = JSON.parse(shopifyProductMatch[1]);
          let price = productData.price;
          if (productData.variants?.length) {
            price = productData.variants[0]?.price ?? price;
          }
          if (price) {
            return {
              name: productData.title,
              price:
                typeof price === "number" ? price / 100 : parseFloat(price),
              currency: "USD",
              brand: productData.vendor,
              image: productData.featured_image,
            };
          }
        } catch {
          // continue
        }
      }

      if (script.includes("price")) {
        const productMatch = script.match(/product["\s]*:["\s]*\{([^}]+)\}/i);
        if (productMatch?.[1]) {
          const priceMatch = productMatch[1].match(
            /price["\s]*:["\s]*([0-9.]+)/i,
          );
          const titleMatch = script.match(
            /title["\s]*:["\s]*["']([^"']+)["']/i,
          );
          if (priceMatch?.[1]) {
            return {
              name: titleMatch?.[1],
              price: parseFloat(priceMatch[1]),
              currency: "USD",
            };
          }
        }
      }
    }
  }

  return {
    name: $("h1").first().text() || $("title").text(),
    description: $('meta[name="description"]').attr("content"),
  };
}

async function extractProductMetadataWithAI(
  html: string,
  url: string,
): Promise<ProductMetadata> {
  try {
    const $ = cheerio.load(html);
    const contentText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .substring(0, 4000);
    const title = $("title").text() || $("h1").first().text() || "";
    const description = $('meta[name="description"]').attr("content") || "";
    const priceElements = $('[class*="price"], [id*="price"], [data-price]')
      .map((_: unknown, el: unknown) => $(el as never).text())
      .get()
      .join(" ");

    const prompt = `Extract product information from this e-commerce page:

<url>${url}</url>

<page-metadata>
<title>${title}</title>
<description>${description}</description>
</page-metadata>

<price-elements>
${priceElements}
</price-elements>

<page-content>
${contentText}
</page-content>

Focus on finding the main product being sold, its price, brand, and other key details.`;

    const ProductExtractionSchema = z.object({
      name: z.string().describe("The product name or title"),
      price: z.number().optional().describe("The product price as a number"),
      currency: z.string().optional().describe("The currency code"),
      brand: z.string().optional().describe("The brand or manufacturer name"),
      availability: z.string().optional().describe("Product availability"),
      description: z.string().optional().describe("Product description"),
      category: z.string().optional().describe("Product category"),
    });

    const result = await withGeminiFallback((google) =>
      generateObject({
        model: google(GEMINI_MODEL_IDS.cheap),
        schema: ProductExtractionSchema,
        prompt,
      }),
    );

    return {
      name: result.object.name,
      price: result.object.price,
      currency: result.object.currency || "USD",
      brand: result.object.brand,
      availability: result.object.availability,
      description: result.object.description,
      category: result.object.category,
    };
  } catch {
    return {};
  }
}

export async function processProductBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
  htmlContent: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;

  // Convert HTML to markdown (aggressive cleaning)
  const $ = cheerio.load(htmlContent);
  $("script, style, link, meta, noscript, iframe, svg").remove();
  $("nav, header, footer, aside, .nav, .header, .footer, .sidebar").remove();
  $(
    "[class*='menu'], [class*='navigation'], [id*='menu'], [id*='nav']",
  ).remove();
  $("[class*='advertisement'], [class*='ads'], [class*='banner']").remove();
  $("img, picture, video, a").remove();

  const contentSelectors = [
    "article",
    "main",
    "[role='main']",
    ".main-content",
    ".content",
    "#main",
    "#content",
    ".product",
    ".product-detail",
    ".product-info",
    "[itemtype*='Product']",
    ".container",
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length > 0 && element.text().trim().length > 100) {
      contentElement = element;
      break;
    }
  }

  if (!contentElement) {
    contentElement = $("body");
    contentElement.find("ul, ol").each(function () {
      const linkCount = $(this).find("a").length;
      const itemCount = $(this).find("li").length;
      if (linkCount > 3 && itemCount > 0 && linkCount / itemCount > 0.7) {
        $(this).remove();
      }
    });
  }

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  turndown.addRule("removeLinks", {
    filter: "a",
    replacement: function (content: string) {
      return content;
    },
  });

  let rawMarkdown = turndown.turndown(contentElement.html() || "");
  const lines = rawMarkdown.split("\n");
  const cleanedLines = lines.filter((line: string) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length < 5) return false;
    if (/^!\[.*\]\(.*\)$/.test(trimmed)) return false;
    if (/^\[.*\]\(.*\)$/.test(trimmed)) return false;
    if (/^[-•*\s#]{3,}$/.test(trimmed)) return false;
    if (/^(Home|Back|Next|Previous|←|→|»|«)(\s|$)/i.test(trimmed))
      return false;
    if (/^(https?:\/\/|\/\/|\.\/|\/)/.test(trimmed)) return false;
    if (/^\d+"\s*(x\s*\d+")?\s*(Black|White|Silver)?\s*$/.test(trimmed))
      return false;
    return true;
  });

  const textOnlyLines = cleanedLines
    .map((line: string) =>
      line
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim(),
    )
    .filter((l: string) => l.length > 0);

  const markdown = textOnlyLines.join("\n").trim();

  const basicMetadata = extractBasicMetadata(htmlContent, bookmark.url);
  const traditionalData = extractProductMetadataFromHtml(htmlContent);

  let aiData: ProductMetadata = {};
  if (!traditionalData.price || traditionalData.price <= 0) {
    aiData = await extractProductMetadataWithAI(htmlContent, bookmark.url);
  }

  // Upload product image to R2
  const imageUrl = traditionalData.image || aiData.image;
  let uploadedImageUrl: string | null = null;
  if (imageUrl) {
    uploadedImageUrl = await uploadFromUrl(
      ctx,
      imageUrl,
      `users/${userId}/bookmarks/${bookmarkId}/products.jpg`,
    );
  }

  const productData = {
    name: traditionalData.name || aiData.name,
    price: traditionalData.price || aiData.price,
    currency: traditionalData.currency || aiData.currency,
    brand: traditionalData.brand || aiData.brand,
    image: uploadedImageUrl,
    availability: traditionalData.availability || aiData.availability,
    description: traditionalData.description || aiData.description,
    category: aiData.category,
  };

  // Analyze product image
  const imageAnalysis = await analyzeScreenshot(
    productData.image || basicMetadata.image || null,
  );

  const contentForSummary = `<product-metadata>
<title>${productData.name || basicMetadata.title || ""}</title>
<description>${productData.description || basicMetadata.description || ""}</description>${
    productData.price
      ? `
<price>${productData.price} ${productData.currency || "USD"}</price>`
      : ""
  }${
    productData.brand
      ? `
<brand>${productData.brand}</brand>`
      : ""
  }${
    productData.category
      ? `
<category>${productData.category}</category>`
      : ""
  }
</product-metadata>

${
  imageAnalysis?.description
    ? `<product-image-description>
${imageAnalysis.description}
</product-image-description>

`
    : ""
}<website-content>
${markdown.substring(0, 2500)}
</website-content>`;

  const displaySummary = contentForSummary
    ? await generateContentSummary(PRODUCT_DISPLAY_SUMMARY_PROMPT, contentForSummary)
    : "";

  const searchSummary = contentForSummary
    ? await generateContentSummary(PRODUCT_SEARCH_SUMMARY_PROMPT, contentForSummary)
    : "";

  const tagNames = contentForSummary
    ? await generateAndCreateTagNames(
        ctx,
        TAGS_PROMPT,
        contentForSummary,
        userId,
      )
    : [];

  const titleForEmbedding =
    productData.name || basicMetadata.title || "Product";
  const embedText = searchSummary
    ? titleForEmbedding + "\n" + searchSummary
    : titleForEmbedding;
  const searchEmbedding = await embedDocument(embedText);

  return {
    type: "PRODUCT",
    title: titleForEmbedding,
    summary: displaySummary,
    vectorSummary: searchSummary,
    preview: productData.image || basicMetadata.image || null,
    ogImageUrl: productData.image || basicMetadata.image || null,
    metadata: {
      price: productData.price,
      currency: productData.currency,
      brand: productData.brand,
      availability: productData.availability,
      description: productData.description || basicMetadata.description || "",
      category: productData.category,
    },
    tagNames,
    searchEmbedding,
    embeddingModel: EMBEDDING_MODEL_KEY,
  };
}

// ---------------------------------------------------------------------------
// processImageBookmark
// ---------------------------------------------------------------------------

export async function processImageBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;

  const response = await safeFetch(bookmark.url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // image-size is pure-JS (no native binary) → works on the Convex runtime.
  const meta = imageSize(buffer);
  const { width, height } = meta;

  const base64Content = buffer.toString("base64");

  const imageAnalysisResult = await withGeminiFallback((google) =>
    generateText({
      model: google(GEMINI_MODEL_IDS.cheap),
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
    }),
  );

  const imageAnalysis = imageAnalysisResult.text;

  const title = imageAnalysis
    ? await generateContentSummary(IMAGE_TITLE_PROMPT, imageAnalysis)
    : "";
  const summary = await generateContentSummary(
    IMAGE_SUMMARY_PROMPT,
    imageAnalysis,
  );
  const vectorSummary = await generateContentSummary(
    IMAGE_SUMMARY_PROMPT,
    imageAnalysis,
  );

  const tagNames = await generateAndCreateTagNames(
    ctx,
    TAGS_PROMPT,
    summary,
    userId,
  );

  // Upload image to R2
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const ext = contentType.split("/")[1] || "jpg";
  const saveImage = await uploadBuffer(
    ctx,
    buffer,
    `users/${userId}/bookmarks/${bookmarkId}/preview.${ext}`,
    contentType,
  );

  const embedText = vectorSummary ? title + "\n" + vectorSummary : title;
  const searchEmbedding = await embedDocument(embedText);

  return {
    type: "IMAGE",
    title,
    summary,
    vectorSummary,
    preview: saveImage,
    metadata: { width, height },
    tagNames,
    searchEmbedding,
    embeddingModel: EMBEDDING_MODEL_KEY,
  };
}

// ---------------------------------------------------------------------------
// processPdfBookmark
// ---------------------------------------------------------------------------

export async function processPdfBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;

  // Download PDF once — reuse for both upload and analysis
  const response = await safeFetch(bookmark.url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }
  const pdfContent = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfContent);
  const fileSize = pdfContent.byteLength;

  // Upload PDF to R2
  const pdfFileName = `pdf-${bookmarkId}-${Date.now()}.pdf`;
  const uploadedPdfUrl = await uploadBuffer(
    ctx,
    pdfBuffer,
    `users/${userId}/bookmarks/${bookmarkId}/${pdfFileName}`,
    "application/pdf",
  );

  // Gemini multimodal PDF analysis
  const pdfAnalysisResult = await withGeminiFallback((google) =>
    generateText({
      model: google(GEMINI_MODEL_IDS.cheap),
      system: PDF_SUMMARY_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Here is the PDF file" },
            {
              type: "file",
              data: new Uint8Array(pdfContent),
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    }),
  );

  const pdfAnalysis = pdfAnalysisResult.text;

  // Title, summary, detailed summary
  const title = pdfAnalysis
    ? await generateContentSummary(PDF_TITLE_PROMPT, pdfAnalysis) ||
      "PDF Document"
    : "PDF Document";
  const summary = await generateContentSummary(USER_SUMMARY_PROMPT, pdfAnalysis);
  const detailedSummary = await generateContentSummary(
    VECTOR_SUMMARY_PROMPT,
    pdfAnalysis,
  );

  // Tags use pdfAnalysis directly
  const tagNames = await generateAndCreateTagNames(
    ctx,
    TAGS_PROMPT,
    pdfAnalysis,
    userId,
  );

  // PDF screenshot
  let screenshotUrl: string | null = null;
  try {
    screenshotUrl = await ctx.runAction(
      internal.processing.screenshot.captureAndUploadPDFScreenshot,
      { url: bookmark.url, userId, bookmarkId: bookmark._id as never },
    ) as string | null;
  } catch {
    screenshotUrl = null;
  }

  const embedText = detailedSummary ? title + "\n" + detailedSummary : title;
  const searchEmbedding = await embedDocument(embedText);

  return {
    type: "PDF",
    title,
    summary,
    vectorSummary: detailedSummary,
    imageDescription: pdfAnalysis,
    ogImageUrl: screenshotUrl,
    metadata: {
      pdfUrl: uploadedPdfUrl,
      originalUrl: bookmark.url,
      fileSize,
      screenshotUrl,
    },
    tagNames,
    searchEmbedding,
    embeddingModel: EMBEDDING_MODEL_KEY,
  };
}

// ---------------------------------------------------------------------------
// processPageBookmark
// ---------------------------------------------------------------------------

export async function processPageBookmark(
  ctx: ActionCtx,
  bookmark: {
    _id: string;
    url: string;
    preview?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  userId: string,
  htmlContent: string,
): Promise<HandlerResult> {
  const bookmarkId = bookmark._id;

  const $ = cheerio.load(htmlContent);
  $("script, style, link, meta, noscript, iframe, svg").remove();

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  const markdown = turndown.turndown($("body").html() || "").trim();

  const pageMetadata = extractPageMetadata(htmlContent, bookmark.url);

  // Screenshot (same logic as article but type=PAGE)
  let screenshotUrl: string | null = null;
  let screenshotAnalysis = {
    description: null as string | null,
    isInvalid: false,
    invalidReason: null as string | null,
  };

  if (bookmark.preview) {
    screenshotUrl = bookmark.preview;
  } else {
    try {
      const screenshotCdnUrl = await ctx.runAction(
        internal.processing.screenshot.captureAndUploadScreenshot,
        { url: bookmark.url, userId, bookmarkId: bookmark._id as never },
      ) as string | null;
      if (screenshotCdnUrl) {
        const response = await fetch(screenshotCdnUrl);
        const ab = await response.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length >= 1000) {
          screenshotAnalysis = await analyzeScreenshotBuffer(buf);
          if (!screenshotAnalysis.isInvalid) {
            screenshotUrl = screenshotCdnUrl;
          }
        }
      }
    } catch {
      if (bookmark.preview) {
        const valid = await isScreenshotUrlValid(bookmark.preview);
        if (valid) screenshotUrl = bookmark.preview;
      }
    }
  }

  const screenshotOrOg = screenshotUrl ?? pageMetadata.ogImageUrl;
  if (!screenshotAnalysis.description && screenshotOrOg) {
    screenshotAnalysis = await analyzeScreenshot(screenshotOrOg);
  }

  const userInput =
    markdown || screenshotAnalysis.description
      ? `${
          markdown
            ? `Here is the content in markdown of the website :
<markdown-content>
${markdown}
</markdown-content>`
            : ""
        }

${
  screenshotAnalysis.description
    ? `Here is the description of the screenshot :
<screenshot-description>
${screenshotAnalysis.description}
</screenshot-description>`
    : ""
}`
      : null;

  let summary = "";
  let vectorSummary = "";
  if (userInput) {
    summary = await generateContentSummary(USER_SUMMARY_PROMPT, userInput);
    vectorSummary = await generateContentSummary(
      VECTOR_SUMMARY_PROMPT,
      userInput,
    );
  }

  const tagNames = vectorSummary
    ? await generateAndCreateTagNames(ctx, TAGS_PROMPT, vectorSummary, userId)
    : [];

  let uploadedOgImageUrl: string | null = null;
  let uploadedFaviconUrl: string | null = null;

  if (pageMetadata.ogImageUrl) {
    uploadedOgImageUrl = await uploadFromUrl(
      ctx,
      pageMetadata.ogImageUrl,
      `users/${userId}/bookmarks/${bookmarkId}/og-image.jpg`,
    );
  }
  if (pageMetadata.faviconUrl) {
    uploadedFaviconUrl = await uploadFromUrl(
      ctx,
      pageMetadata.faviconUrl,
      `users/${userId}/bookmarks/${bookmarkId}/favicon.ico`,
    );
  }

  // screenshotUrl is only set when the capture was analyzed as valid; if it
  // is missing or flagged invalid, fall back to the uploaded OG image.
  const finalPreview = screenshotAnalysis.isInvalid
    ? uploadedOgImageUrl
    : (screenshotUrl ?? uploadedOgImageUrl);

  let searchEmbedding: number[] | undefined;
  if (pageMetadata.title || vectorSummary) {
    const text = vectorSummary
      ? pageMetadata.title + "\n" + vectorSummary
      : pageMetadata.title;
    searchEmbedding = await embedDocument(text);
  }

  return {
    type: "PAGE",
    title: pageMetadata.title,
    summary,
    vectorSummary,
    preview: finalPreview,
    faviconUrl: uploadedFaviconUrl,
    ogImageUrl: uploadedOgImageUrl,
    ogDescription: pageMetadata.ogDescription,
    imageDescription:
      typeof screenshotAnalysis.description === "string"
        ? screenshotAnalysis.description
        : null,
    tagNames,
    searchEmbedding,
    embeddingModel: searchEmbedding ? EMBEDDING_MODEL_KEY : undefined,
  };
}
