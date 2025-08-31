import { SafeRouteError } from "@/lib/errors";
import { routeClient } from "@/lib/safe-route";
import { getPostHogClient } from "@/lib/posthog";
import { getPosthogId } from "@/lib/posthog-id";
import { ANALYTICS } from "@/lib/analytics";
import * as cheerio from "cheerio";
import { 
  extractFaviconsRequestSchema, 
  type ExtractFaviconsResponse,
  type FaviconInfo 
} from "./extract-favicons.types";

const FAVICON_FORMATS = ["ico", "png", "svg", "jpg", "jpeg", "gif", "webp"];

// Standard favicon locations to check
const STANDARD_FAVICON_PATHS = [
  "/favicon.ico",
  "/favicon.png", 
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/apple-touch-icon-152x152.png",
  "/apple-touch-icon-180x180.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

async function validateImageUrl(url: string): Promise<{ isValid: boolean; width?: number; height?: number; fileSize?: number; errorMessage?: string }> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return { isValid: false, errorMessage: `HTTP ${response.status}: ${response.statusText}` };
    }

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    
    if (!contentType || !contentType.startsWith("image/")) {
      return { isValid: false, errorMessage: `Invalid content type: ${contentType}` };
    }

    const fileSize = contentLength ? parseInt(contentLength) : undefined;

    // For SVG files, we can't easily get dimensions without downloading
    if (contentType === "image/svg+xml") {
      return { isValid: true, fileSize };
    }

    // Try to get image dimensions for other formats
    try {
      const imageResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Range": "bytes=0-1023", // Only get first 1KB to read headers
        },
      });

      if (imageResponse.ok) {
        // This is a simplified approach - in a real implementation you might want to use a proper image metadata library
        return { isValid: true, fileSize };
      }
    } catch {
      // If we can't get dimensions, it's still valid if the HEAD request succeeded
    }

    return { isValid: true, fileSize };
  } catch (error) {
    return { isValid: false, errorMessage: error instanceof Error ? error.message : "Unknown error" };
  }
}

function extractFormatFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname.toLowerCase();
  const extension = pathname.split('.').pop();
  
  if (extension && FAVICON_FORMATS.includes(extension)) {
    return extension;
  }
  
  // Default to ico for standard favicon paths
  if (pathname === "/favicon.ico" || pathname.endsWith("favicon.ico")) {
    return "ico";
  }
  
  return "png"; // Default fallback
}

function extractSizeFromUrl(url: string): { size?: string; width?: number; height?: number } {
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    return { size: `${width}x${height}`, width, height };
  }
  return {};
}

function categorizeFaviconType(rel: string, href: string): FaviconInfo["type"] {
  const relLower = rel.toLowerCase();
  const hrefLower = href.toLowerCase();
  
  if (relLower.includes("apple-touch-icon-precomposed")) return "apple-touch-icon-precomposed";
  if (relLower.includes("apple-touch-icon")) return "apple-touch-icon";
  if (hrefLower.includes("android") || relLower.includes("android")) return "android-icon";
  if (relLower.includes("shortcut")) return "shortcut-icon";
  if (relLower === "icon") return "icon";
  if (hrefLower.includes("favicon")) return "favicon";
  
  return "icon";
}

export const POST = routeClient
  .body(extractFaviconsRequestSchema)
  .handler(async (req, { body }): Promise<ExtractFaviconsResponse> => {
    const { url } = body;
    const posthog = getPostHogClient();
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const distinctId = getPosthogId(ip, userAgent);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new SafeRouteError("Failed to fetch the webpage", 400);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const baseUrl = new URL(url);
      const domain = baseUrl.hostname;
      const title = $("title").text();

      const resolveUrl = (faviconUrl: string) => {
        try {
          if (faviconUrl.startsWith("http")) return faviconUrl;
          if (faviconUrl.startsWith("//")) return `${baseUrl.protocol}${faviconUrl}`;
          if (faviconUrl.startsWith("/")) return `${baseUrl.origin}${faviconUrl}`;
          return `${baseUrl.origin}/${faviconUrl}`;
        } catch {
          return null;
        }
      };

      const faviconCandidates: Array<{ url: string; type: FaviconInfo["type"]; rel?: string; size?: string; width?: number; height?: number }> = [];

      // Extract favicons from HTML link tags
      $("link[rel*='icon'], link[rel*='shortcut']").each((_, element) => {
        const $el = $(element);
        const href = $el.attr("href");
        const rel = $el.attr("rel") || "";
        const sizes = $el.attr("sizes");
        
        if (href) {
          const resolvedUrl = resolveUrl(href);
          if (resolvedUrl) {
            const sizeInfo = extractSizeFromUrl(resolvedUrl);
            const type = categorizeFaviconType(rel, href);
            
            // Handle sizes attribute
            if (sizes && sizes !== "any") {
              const sizeMatches = sizes.match(/(\d+)x(\d+)/g);
              if (sizeMatches) {
                sizeMatches.forEach(sizeMatch => {
                  const [width, height] = sizeMatch.split('x').map(Number);
                  faviconCandidates.push({
                    url: resolvedUrl,
                    type,
                    rel,
                    size: sizeMatch,
                    width,
                    height,
                  });
                });
              } else {
                faviconCandidates.push({
                  url: resolvedUrl,
                  type,
                  rel,
                  ...sizeInfo,
                });
              }
            } else {
              faviconCandidates.push({
                url: resolvedUrl,
                type,
                rel,
                ...sizeInfo,
              });
            }
          }
        }
      });

      // Check standard favicon locations
      for (const path of STANDARD_FAVICON_PATHS) {
        const faviconUrl = `${baseUrl.origin}${path}`;
        const sizeInfo = extractSizeFromUrl(faviconUrl);
        
        // Determine type based on path
        let type: FaviconInfo["type"] = "favicon";
        if (path.includes("apple-touch-icon")) type = "apple-touch-icon";
        else if (path.includes("icon-")) type = "android-icon";
        
        faviconCandidates.push({
          url: faviconUrl,
          type,
          ...sizeInfo,
        });
      }

      // Remove duplicates
      const uniqueFavicons = faviconCandidates.filter((favicon, index, self) => 
        index === self.findIndex(f => f.url === favicon.url)
      );

      // Validate all favicon URLs
      const faviconPromises = uniqueFavicons.map(async (candidate): Promise<FaviconInfo> => {
        const format = extractFormatFromUrl(candidate.url);
        const validation = await validateImageUrl(candidate.url);
        
        return {
          url: candidate.url,
          type: candidate.type,
          format: format as FaviconInfo["format"],
          size: candidate.size,
          width: candidate.width || validation.width,
          height: candidate.height || validation.height,
          fileSize: validation.fileSize,
          rel: candidate.rel,
          isValid: validation.isValid,
          errorMessage: validation.errorMessage,
        };
      });

      const favicons = await Promise.all(faviconPromises);
      const validFavicons = favicons.filter(f => f.isValid);

      // Find special favicons
      const standardFavicon = validFavicons.find(f => f.url.endsWith("/favicon.ico"));
      const appleTouchIcons = validFavicons.filter(f => f.type === "apple-touch-icon");
      const androidIcons = validFavicons.filter(f => f.type === "android-icon");
      const svgIcon = validFavicons.find(f => f.format === "svg");
      
      // Find largest icons
      const appleTouchIcon = appleTouchIcons.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
      const androidIcon = androidIcons.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
      const largestIcon = validFavicons.sort((a, b) => (b.width || 0) - (a.width || 0))[0];

      const result = {
        url,
        favicons,
        metadata: {
          title: title || undefined,
          domain,
          totalFavicons: favicons.length,
          validFavicons: validFavicons.length,
          standardFavicon,
          appleTouchIcon,
          androidIcon,
          svgIcon,
          largestIcon,
        },
      };

      // Track successful usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-favicons",
        },
      });

      return result;
    } catch (error) {
      console.error("Error extracting favicons:", error);
      
      // Track error
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-favicons",
        },
      });

      throw new SafeRouteError(
        error instanceof Error ? error.message : "Failed to extract favicons",
        400
      );
    }
  });