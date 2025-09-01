import { Bookmark, BookmarkType } from "@workspace/database";
import { logger } from "../../logger";
import * as cheerio from "cheerio";
import metascraper from "metascraper";
import metascraperTitle from "metascraper-title";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperUrl from "metascraper-url";
import { InngestPublish, InngestStep } from "../inngest.utils";
import { BOOKMARK_STEP_ID_TO_ID } from "../process-bookmark.step";
import {
  generateContentSummary,
  generateAndCreateTags,
  updateBookmarkWithMetadata,
} from "../process-bookmark.utils";
import {
  USER_SUMMARY_PROMPT,
  TAGS_PROMPT,
} from "../prompt.const";

const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperUrl(),
]);

interface ProductMetadata {
  name?: string;
  price?: number;
  currency?: string;
  brand?: string;
  image?: string;
  availability?: string;
  description?: string;
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
      if (jsonLd['@type'] === 'Product' || jsonLd.mainEntity?.['@type'] === 'Product') {
        return true;
      }
    } catch {
      // Invalid JSON-LD, continue checking
    }
  }
  
  // 2. Check for OpenGraph product type
  if ($('meta[property="og:type"]').attr('content') === 'product') {
    return true;
  }
  
  // 3. Check for e-commerce URL patterns combined with price indicators
  const isEcommerceUrl = /\/(product|item|p)\/|\/products\/|\/shop\/|\/buy\//.test(url);
  const hasPrice = /price|cost|\$|€|£|¥|\d+\.\d{2}/.test(html.toLowerCase());
  
  if (isEcommerceUrl && hasPrice) {
    return true;
  }
  
  // 4. Check for common e-commerce platform indicators
  const hasEcommercePlatform = html.includes('Shopify') || 
                               html.includes('WooCommerce') || 
                               html.includes('product') && html.includes('cart');
  
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
      const product = jsonLd['@type'] === 'Product' ? jsonLd : jsonLd.mainEntity;
      
      if (product?.['@type'] === 'Product') {
        return {
          name: product.name,
          price: product.offers?.price || product.price,
          currency: product.offers?.priceCurrency || 'USD',
          brand: product.brand?.name || product.brand,
          image: Array.isArray(product.image) ? product.image[0] : product.image,
          availability: product.offers?.availability,
          description: product.description,
        };
      }
    } catch (e) {
      logger.warn('Invalid JSON-LD:', e);
    }
  }
  
  // 2. Try OpenGraph product metadata (fallback)
  const ogProduct: ProductMetadata = {
    name: $('meta[property="og:title"]').attr('content'),
    price: parseFloat($('meta[property="product:price:amount"]').attr('content') || '0') || undefined,
    currency: $('meta[property="product:price:currency"]').attr('content') || 'USD',
    brand: $('meta[property="product:brand"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    availability: $('meta[property="product:availability"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
  };
  
  if (ogProduct.price && ogProduct.price > 0) {
    return ogProduct;
  }
  
  // 3. Try JavaScript product data extraction (e-commerce platforms)
  const scripts = $('script:not([src])').map((i, el) => $(el).html()).get();
  for (const script of scripts) {
    if (script && script.includes('product') && script.includes('price')) {
      // Look for common patterns in JavaScript
      const productMatch = script.match(/product["\s]*:["\s]*\{([^}]+)\}/i);
      if (productMatch) {
        try {
          const priceMatch = productMatch[1]?.match(/price["\s]*:["\s]*([0-9.]+)/i);
          const titleMatch = script.match(/title["\s]*:["\s]*["']([^"']+)["']/i);
          
          if (priceMatch?.[1]) {
            return {
              name: titleMatch?.[1],
              price: parseFloat(priceMatch[1]),
              currency: 'USD', // Default, could be enhanced to detect currency
            };
          }
        } catch (e) {
          logger.warn('Error parsing JS product data:', e);
        }
      }
    }
  }
  
  // 4. Fallback to basic HTML parsing
  return {
    name: $('h1').first().text() || $('title').text(),
    description: $('meta[name="description"]').attr('content'),
  };
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
  // Extract basic metadata using metascraper
  const basicMetadata = await step.run("extract-basic-metadata", async () => {
    return await scraper({ url: context.url, html: context.content });
  });

  // Extract product-specific metadata
  const productData = await step.run("extract-product-metadata", async () => {
    return extractProductMetadata(context.content);
  });

  // Generate content summary for the product description
  const contentForSummary = `Title: ${productData.name || basicMetadata.title || ""}\nDescription: ${productData.description || basicMetadata.description || ""}${productData.price ? `\nPrice: ${productData.price} ${productData.currency || 'USD'}` : ""}`;
  
  const summary = await step.run("get-summary", async () => {
    if (!contentForSummary) return "";
    return await generateContentSummary(USER_SUMMARY_PROMPT, contentForSummary);
  });

  // Generate tags for the product
  const tags = await step.run("get-tags", async () => {
    if (!contentForSummary) return [];
    return await generateAndCreateTags(TAGS_PROMPT, contentForSummary, context.userId);
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
      },
      tags,
    });
  });

  await step.run(BOOKMARK_STEP_ID_TO_ID.finish, async () => {
    await publish({
      channel: `bookmark:${context.bookmarkId}`,
      topic: "finish",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID.finish,
        order: 9,
      },
    });
  });

  logger.info(`Product bookmark processed: ${context.bookmarkId}`);
}