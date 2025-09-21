import { uploadFileFromURLToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateObject } from "ai";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { z } from "zod";
import { logger } from "../../logger";
import { OPENAI_MODELS } from "../../openai";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  generateAndCreateTags,
  generateContentSummary,
  updateBookmarkWithMetadata,
} from "../process-bookmark.utils";
import {
  PRODUCT_DISPLAY_SUMMARY_PROMPT,
  PRODUCT_SEARCH_SUMMARY_PROMPT,
  TAGS_PROMPT,
} from "../prompt.const";
import { analyzeScreenshot } from "../screenshot-analysis.utils";

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

function extractBasicMetadata(html: string, url: string): BasicMetadata {
  const $ = cheerio.load(html);

  // Extract title (prefer OpenGraph, then meta title, then h1, then page title)
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $('meta[name="title"]').attr("content") ||
    $("h1").first().text() ||
    $("title").text() ||
    "";

  // Extract description (prefer OpenGraph, then meta description)
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  // Extract image (prefer OpenGraph, then Twitter, then first img)
  let image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $("img").first().attr("src") ||
    "";

  // Make image URL absolute if it's relative
  if (image && !image.startsWith("http")) {
    const baseUrl = new URL(url);
    if (image.startsWith("/")) {
      image = `${baseUrl.origin}${image}`;
    } else {
      image = `${baseUrl.origin}/${image}`;
    }
  }

  return {
    title: title.trim(),
    description: description.trim(),
    image,
    url,
  };
}

export function isProductPage(url: string, html: string): boolean {
  const $ = cheerio.load(html);

  // 1. Check for Schema.org JSON-LD Product markup
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
      // Invalid JSON-LD, continue checking
    }
  }

  // 2. Check for OpenGraph product type
  if ($('meta[property="og:type"]').attr("content") === "product") {
    return true;
  }

  // 3. Check for e-commerce URL patterns combined with price indicators
  const isEcommerceUrl =
    /\/(product|item|p)\/|\/products\/|\/shop\/|\/buy\//.test(url);
  const hasPrice = /price|cost|\$|€|£|¥|\d+\.\d{2}/.test(html.toLowerCase());

  if (isEcommerceUrl && hasPrice) {
    return true;
  }

  // 4. Check for common e-commerce platform indicators
  const hasEcommercePlatform =
    html.includes("Shopify") ||
    html.includes("WooCommerce") ||
    (html.includes("product") && html.includes("cart"));

  return isEcommerceUrl && hasEcommercePlatform;
}

export function extractProductMetadata(html: string): ProductMetadata {
  const $ = cheerio.load(html);

  // 1. Try Schema.org JSON-LD Product (highest priority)
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
    } catch (e) {
      logger.warn("Invalid JSON-LD:", e);
    }
  }

  // 2. Try OpenGraph product metadata (fallback)
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

  if (ogProduct.price && ogProduct.price > 0) {
    return ogProduct;
  }

  // 3. Try JavaScript product data extraction (e-commerce platforms)
  const scripts = $("script:not([src])")
    .map((i, el) => $(el).html())
    .get();
  for (const script of scripts) {
    if (script && script.includes("product")) {
      // Look for Shopify product data (enhanced)
      const shopifyProductMatch = script.match(
        /"product"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/i,
      );
      if (shopifyProductMatch) {
        try {
          if (!shopifyProductMatch[1]) throw new Error("no data");
          const productData = JSON.parse(shopifyProductMatch[1]);

          // Look for variants with pricing
          let price = productData.price;
          if (productData.variants && Array.isArray(productData.variants)) {
            const firstVariant = productData.variants[0];
            if (firstVariant && firstVariant.price) {
              price = firstVariant.price;
            }
          }

          if (price) {
            return {
              name: productData.title,
              price:
                typeof price === "number" ? price / 100 : parseFloat(price), // Shopify stores in cents
              currency: "USD",
              brand: productData.vendor,
              image: productData.featured_image,
            };
          }
        } catch (e) {
          logger.warn("Error parsing Shopify data:", e);
        }
      }

      // Look for price patterns in any script containing product
      if (script.includes("price")) {
        const productMatch = script.match(/product["\s]*:["\s]*\{([^}]+)\}/i);
        if (productMatch) {
          try {
            const priceMatch = productMatch[1]?.match(
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
          } catch (e) {
            logger.warn("Error parsing JS product data:", e);
          }
        }
      }
    }
  }

  // 4. Fallback to basic HTML parsing
  return {
    name: $("h1").first().text() || $("title").text(),
    description: $('meta[name="description"]').attr("content"),
  };
}

const ProductExtractionSchema = z.object({
  name: z.string().describe("The product name or title"),
  price: z
    .number()
    .optional()
    .describe("The product price as a number (e.g., 29.99)"),
  currency: z
    .string()
    .optional()
    .describe("The currency code (e.g., USD, EUR)"),
  brand: z.string().optional().describe("The brand or manufacturer name"),
  availability: z
    .string()
    .optional()
    .describe("Product availability (e.g., 'in stock', 'out of stock')"),
  description: z.string().optional().describe("Product description or summary"),
  category: z
    .string()
    .optional()
    .describe("Product category (e.g., 'electronics', 'clothing')"),
});

export async function extractProductMetadataWithAI(
  html: string,
  url: string,
): Promise<ProductMetadata> {
  try {
    const $ = cheerio.load(html);

    // Extract the main content text and preserve important pricing elements
    const contentText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .substring(0, 4000); // Limit content for API efficiency

    // Extract key elements that might contain product data
    const title = $("title").text() || $("h1").first().text() || "";
    const description = $('meta[name="description"]').attr("content") || "";
    const priceElements = $('[class*="price"], [id*="price"], [data-price]')
      .map((_, el) => $(el).text())
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

    const result = await generateObject({
      model: OPENAI_MODELS.cheap,
      schema: ProductExtractionSchema,
      prompt,
    });

    logger.info("AI extraction completed for:", url);
    return {
      name: result.object.name,
      price: result.object.price,
      currency: result.object.currency || "USD",
      brand: result.object.brand,
      availability: result.object.availability,
      description: result.object.description,
      category: result.object.category,
    };
  } catch (error) {
    logger.error("AI extraction failed:", error);
    return {};
  }
}

export async function processProductBookmark(
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
  // Convert HTML to markdown for better content analysis
  const markdown = await step.run("convert-to-markdown", async () => {
    const $ = cheerio.load(context.content);

    // Remove noise elements
    $("script, style, link, meta, noscript, iframe, svg").remove();
    $("nav, header, footer, aside, .nav, .header, .footer, .sidebar").remove();
    $(
      "[class*='menu'], [class*='navigation'], [id*='menu'], [id*='nav']",
    ).remove();
    $("[class*='advertisement'], [class*='ads'], [class*='banner']").remove();

    // Remove ALL images, videos and links completely
    $("img, picture, video, a").remove();

    // Try to find main content areas (in order of preference)
    let contentElement = null;
    const contentSelectors = [
      "article", // Most semantic
      "main",
      "[role='main']",
      ".main-content",
      ".content",
      "#main",
      "#content",
      ".product",
      ".product-detail",
      ".product-info",
      "[itemtype*='Product']", // Schema.org Product
      ".container", // Fallback
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0 && element.text().trim().length > 100) {
        contentElement = element;
        break;
      }
    }

    // If no main content found, use body but clean it more
    if (!contentElement) {
      contentElement = $("body");
      // Remove more noise from body
      contentElement.find("ul, ol").each(function () {
        const linkCount = $(this).find("a").length;
        const itemCount = $(this).find("li").length;
        // Remove lists that are mostly links (likely navigation)
        if (linkCount > 3 && linkCount / itemCount > 0.7) {
          $(this).remove();
        }
      });
    }

    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Remove links but keep the text content
    turndown.addRule("removeLinks", {
      filter: "a",
      replacement: function (content) {
        // Keep the text content but remove the link
        return content;
      },
    });

    let markdown = turndown.turndown(contentElement.html() || "");

    // Clean up the markdown to remove noise and get actual content
    const lines = markdown.split("\n");
    const cleanedLines = lines.filter((line) => {
      const trimmed = line.trim();

      // Skip empty lines
      if (trimmed.length === 0) return false;

      // Skip very short lines (likely noise)
      if (trimmed.length < 5) return false;

      // Skip markdown images ![...](...)
      if (/^!\[.*\]\(.*\)$/.test(trimmed)) return false;

      // Skip markdown links that are just URLs [text](url)
      if (/^\[.*\]\(.*\)$/.test(trimmed)) return false;

      // Skip lines that are mostly symbols or repeated characters
      if (/^[-•*\s#]{3,}$/.test(trimmed)) return false;

      // Skip lines that look like breadcrumbs or navigation
      if (/^(Home|Back|Next|Previous|←|→|»|«)(\s|$)/i.test(trimmed))
        return false;

      // Skip lines that are just URLs or image paths
      if (/^(https?:\/\/|\/\/|\.\/|\/)/.test(trimmed)) return false;

      // Skip lines with only dimensions or model numbers
      if (/^\d+"\s*(x\s*\d+")?\s*(Black|White|Silver)?\s*$/.test(trimmed))
        return false;

      return true;
    });

    // Remove markdown image syntax from remaining lines
    const textOnlyLines = cleanedLines
      .map((line) => {
        // Remove inline image markdown ![alt](url)
        return line
          .replace(/!\[.*?\]\(.*?\)/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Keep link text, remove URL
          .trim();
      })
      .filter((line) => line.length > 0);

    markdown = textOnlyLines.join("\n").trim();

    return markdown;
  });

  // Extract basic metadata using cheerio
  const basicMetadata = await step.run("extract-basic-metadata", async () => {
    return extractBasicMetadata(context.content, context.url);
  });

  // Extract product-specific metadata
  const productData = await step.run("extract-product-metadata", async () => {
    const traditionalData = extractProductMetadata(context.content);

    let aiData: ProductMetadata = {};

    // If we don't have critical data (price), use AI as fallback
    if (!traditionalData.price || traditionalData.price <= 0) {
      aiData = await extractProductMetadataWithAI(context.content, context.url);
    } else {
      logger.info(
        `Traditional extraction sufficient for ${context.bookmarkId}, skipping AI extraction.`,
      );
    }

    // Always upload the image to S3 if available
    const imageUrl = traditionalData.image || aiData.image;
    const uploadedImageUrl = imageUrl
      ? await uploadFileFromURLToS3({
          url: imageUrl,
          prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
          fileName: "products",
        })
      : undefined;

    const finalProductData = {
      name: traditionalData.name || aiData.name,
      price: traditionalData.price || aiData.price,
      currency: traditionalData.currency || aiData.currency,
      brand: traditionalData.brand || aiData.brand,
      image: uploadedImageUrl,
      availability: traditionalData.availability || aiData.availability,
      description: traditionalData.description || aiData.description,
      category: aiData.category, // AI is better at categorization
    };

    return finalProductData;
  });

  // Analyze product image if available
  const imageAnalysis = await step.run("analyze-product-image", async () => {
    const imageUrl = productData.image || basicMetadata.image;
    if (!imageUrl) {
      return null;
    }

    try {
      const analysis = await analyzeScreenshot(imageUrl);
      return analysis;
    } catch (error) {
      logger.warn(
        `Product image analysis failed for ${context.bookmarkId}:`,
        error,
      );
      return null;
    }
  });

  // Prepare content for summaries with markdown content
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
</website-content>`; // Reduced to 2500 to make room for image analysis

  // Generate user-facing display summary (short and clean)
  const displaySummary = await step.run("get-display-summary", async () => {
    if (!contentForSummary) return "";

    return await generateContentSummary(
      PRODUCT_DISPLAY_SUMMARY_PROMPT,
      contentForSummary,
      {
        bookmarkId: context.bookmarkId,
        type: "user",
      },
    );
  });

  // Generate search-optimized summary (keyword-rich for vector search)
  const searchSummary = await step.run("get-search-summary", async () => {
    if (!contentForSummary) return "";

    return await generateContentSummary(
      PRODUCT_SEARCH_SUMMARY_PROMPT,
      contentForSummary,
      {
        bookmarkId: context.bookmarkId,
        type: "vector",
      },
    );
  });

  // Generate tags for the product
  const tags = await step.run("get-tags", async () => {
    if (!contentForSummary) return [];
    return await generateAndCreateTags(
      TAGS_PROMPT,
      contentForSummary,
      context.userId,
    );
  });

  // Update bookmark with product-specific data
  await step.run("update-bookmark", async () => {
    await updateBookmarkWithMetadata({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.PRODUCT,
      title: productData.name || basicMetadata.title || "Product",
      summary: displaySummary || "", // Use display summary for UI
      vectorSummary: searchSummary || "", // Use search summary for vector search
      // Use product image instead of screenshot for preview
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
      tags,
    });
  });

  await publish({
    channel: `bookmark:${context.bookmarkId}`,
    topic: "finish",
    data: {
      id: BOOKMARK_STEP_ID_TO_ID.finish,
      order: 9,
    },
  });

  await step.run("update-embedding", async () => {
    // Use product name or fallback to title
    const titleForEmbedding =
      productData.name || basicMetadata.title || "Product";

    if (!searchSummary || !titleForEmbedding) {
      if (!searchSummary) return;
    }

    try {
      // Use the search-optimized summary for embeddings
      const embedding = await embedMany({
        model: OPENAI_MODELS.embedding,
        values: [searchSummary, titleForEmbedding],
      });
      const [vectorSummaryEmbedding, titleEmbedding] = embedding.embeddings;

      // Update embeddings in database
      await prisma.$executeRaw`
        UPDATE "Bookmark"
        SET
          "titleEmbedding" = ${titleEmbedding}::vector,
          "vectorSummaryEmbedding" = ${vectorSummaryEmbedding}::vector
        WHERE id = ${context.bookmarkId}
      `;
    } catch (error) {
      logger.error(`💃 EMBEDDING ERROR for ${context.bookmarkId}:`, error);
      throw error;
    }
  });
}
