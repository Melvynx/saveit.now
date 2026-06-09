import {
  captureToolUsage,
  fetchHtml,
  resolveUrl,
  TOOL_USER_AGENT,
  toolErrorResponse,
} from "@/lib/tools/tool-route-utils";
import {
  extractFaviconsRequestSchema,
  type ExtractFaviconsResponse,
  type FaviconInfo,
} from "@/lib/tools/schemas/extract-favicons";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

const FAVICON_FORMATS = ["ico", "png", "svg", "jpg", "jpeg", "gif", "webp"];
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

async function validateImageUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": TOOL_USER_AGENT },
    });
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (!response.ok) {
      return {
        isValid: false,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    if (!contentType?.startsWith("image/")) {
      return {
        isValid: false,
        errorMessage: `Invalid content type: ${contentType}`,
      };
    }

    return {
      isValid: true,
      fileSize: contentLength ? Number.parseInt(contentLength, 10) : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function extractFormatFromUrl(url: string): FaviconInfo["format"] {
  const extension = new URL(url).pathname.toLowerCase().split(".").pop();
  return extension && FAVICON_FORMATS.includes(extension)
    ? (extension as FaviconInfo["format"])
    : "png";
}

function extractSizeFromUrl(url: string) {
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (!sizeMatch) return {};
  const width = Number.parseInt(sizeMatch[1]!, 10);
  const height = Number.parseInt(sizeMatch[2]!, 10);
  return { size: `${width}x${height}`, width, height };
}

function categorizeFaviconType(
  rel: string,
  href: string,
): FaviconInfo["type"] {
  const relLower = rel.toLowerCase();
  const hrefLower = href.toLowerCase();

  if (relLower.includes("apple-touch-icon-precomposed")) {
    return "apple-touch-icon-precomposed";
  }
  if (relLower.includes("apple-touch-icon")) return "apple-touch-icon";
  if (hrefLower.includes("android") || relLower.includes("android")) {
    return "android-icon";
  }
  if (relLower.includes("shortcut")) return "shortcut-icon";
  if (relLower === "icon") return "icon";
  if (hrefLower.includes("favicon")) return "favicon";
  return "icon";
}

export const Route = createFileRoute("/api/tools/extract-favicons")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = extractFaviconsRequestSchema.parse(
            await request.json(),
          );
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);
          const baseUrl = new URL(url);
          const faviconCandidates: Array<
            Omit<FaviconInfo, "format" | "isValid" | "errorMessage" | "fileSize">
          > = [];

          $("link[rel*='icon'], link[rel*='shortcut']").each((_, element) => {
            const href = $(element).attr("href");
            const rel = $(element).attr("rel") ?? "";
            const sizes = $(element).attr("sizes");
            const resolved = resolveUrl(baseUrl, href);
            if (!href || !resolved) return;

            const type = categorizeFaviconType(rel, href);
            const sizeMatches =
              sizes && sizes !== "any" ? sizes.match(/(\d+)x(\d+)/g) : null;

            if (sizeMatches) {
              for (const size of sizeMatches) {
                const [width, height] = size.split("x").map(Number);
                faviconCandidates.push({
                  url: resolved,
                  type,
                  rel,
                  size,
                  width,
                  height,
                });
              }
              return;
            }

            faviconCandidates.push({
              url: resolved,
              type,
              rel,
              ...extractSizeFromUrl(resolved),
            });
          });

          for (const path of STANDARD_FAVICON_PATHS) {
            const faviconUrl = `${baseUrl.origin}${path}`;
            faviconCandidates.push({
              url: faviconUrl,
              type: path.includes("apple-touch-icon")
                ? "apple-touch-icon"
                : path.includes("icon-")
                  ? "android-icon"
                  : "favicon",
              ...extractSizeFromUrl(faviconUrl),
            });
          }

          const uniqueCandidates = faviconCandidates.filter(
            (favicon, index, items) =>
              index === items.findIndex((item) => item.url === favicon.url),
          );
          const favicons = await Promise.all(
            uniqueCandidates.map(async (candidate): Promise<FaviconInfo> => {
              const validation = await validateImageUrl(candidate.url);
              return {
                ...candidate,
                format: extractFormatFromUrl(candidate.url),
                fileSize: validation.fileSize,
                isValid: validation.isValid,
                errorMessage: validation.errorMessage,
              };
            }),
          );
          const validFavicons = favicons.filter((favicon) => favicon.isValid);
          const appleTouchIcon = validFavicons
            .filter((favicon) => favicon.type === "apple-touch-icon")
            .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
          const androidIcon = validFavicons
            .filter((favicon) => favicon.type === "android-icon")
            .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];

          const result: ExtractFaviconsResponse = {
            url,
            favicons,
            metadata: {
              title: $("title").text() || undefined,
              domain: baseUrl.hostname,
              totalFavicons: favicons.length,
              validFavicons: validFavicons.length,
              standardFavicon: validFavicons.find((favicon) =>
                favicon.url.endsWith("/favicon.ico"),
              ),
              appleTouchIcon,
              androidIcon,
              svgIcon: validFavicons.find((favicon) => favicon.format === "svg"),
              largestIcon: [...validFavicons].sort(
                (a, b) => (b.width ?? 0) - (a.width ?? 0),
              )[0],
            },
          };

          await captureToolUsage(request, "extract-favicons");
          return Response.json(result);
        } catch (error) {
          await captureToolUsage(request, "extract-favicons");
          return toolErrorResponse(error);
        }
      },
    },
  },
});
