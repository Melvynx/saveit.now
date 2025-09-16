import { uploadFileFromURLToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { Bookmark, BookmarkType, prisma } from "@workspace/database";
import { embedMany, generateObject } from "ai";
import * as cheerio from "cheerio";
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
import { TAGS_PROMPT, USER_SUMMARY_PROMPT } from "../prompt.const";

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
    
URL: ${url}
Title: ${title}
Description: ${description}
Price elements: ${priceElements}
Content: ${contentText}

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
  // Extract basic metadata using cheerio
  const basicMetadata = await step.run("extract-basic-metadata", async () => {
    return extractBasicMetadata(context.content, context.url);
  });

  // Extract product-specific metadata
  const productData = await step.run("extract-product-metadata", async () => {
    const traditionalData = extractProductMetadata(context.content);

    // If we got critical data (price), use traditional extraction
    if (traditionalData.price && traditionalData.price > 0) {
      logger.info("Traditional extraction successful with price data");
      return traditionalData;
    }

    // Otherwise use AI as fallback to fill missing data
    logger.info("Using AI fallback extraction for missing data");
    const aiData = await extractProductMetadataWithAI(
      context.content,
      context.url,
    );

    const url = traditionalData.image || aiData.image;

    const screenshotUrl = url
      ? await uploadFileFromURLToS3({
          url: url,
          prefix: `users/${context.userId}/bookmarks/${context.bookmarkId}`,
          fileName: "products",
        })
      : undefined;

    return {
      name: traditionalData.name || aiData.name,
      price: traditionalData.price || aiData.price,
      currency: traditionalData.currency || aiData.currency,
      brand: traditionalData.brand || aiData.brand,
      image: screenshotUrl,
      availability: traditionalData.availability || aiData.availability,
      description: traditionalData.description || aiData.description,
      category: aiData.category, // AI is better at categorization
    };
  });

  // Generate content summary for the product description
  const contentForSummary = `Title: ${productData.name || basicMetadata.title || ""}\nDescription: ${productData.description || basicMetadata.description || ""}${productData.price ? `\nPrice: ${productData.price} ${productData.currency || "USD"}` : ""}`;

  const summary = await step.run("get-summary", async () => {
    if (!contentForSummary) return "";
    return await generateContentSummary(USER_SUMMARY_PROMPT, contentForSummary);
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
      summary: summary || "",
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
    if (!summary || !productData.name) return;

    const embedding = await embedMany({
      model: OPENAI_MODELS.embedding,
      values: [summary || "", productData.name || ""],
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
  });

  logger.info(`Product bookmark processed: ${context.bookmarkId}`);
}
