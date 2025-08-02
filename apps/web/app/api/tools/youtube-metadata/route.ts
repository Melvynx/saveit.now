import { routeClient } from "@/lib/safe-route";
import { getPostHogClient } from "@/lib/posthog";
import { getPosthogId } from "@/lib/posthog-id";
import { ANALYTICS } from "@/lib/analytics";
import * as cheerio from "cheerio";
import { 
  extractYoutubeMetadataRequestSchema, 
  type ExtractYoutubeMetadataResponse,
  type YoutubeThumbnail 
} from "./youtube-metadata.types";

// YouTube URL patterns to extract video ID
const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function generateThumbnails(videoId: string): YoutubeThumbnail[] {
  const thumbnailQualities = [
    { quality: "default" as const, width: 120, height: 90 },
    { quality: "mqdefault" as const, width: 320, height: 180 },
    { quality: "hqdefault" as const, width: 480, height: 360 },
    { quality: "sddefault" as const, width: 640, height: 480 },
    { quality: "maxresdefault" as const, width: 1280, height: 720 },
  ];

  return thumbnailQualities.map(({ quality, width, height }) => ({
    url: `https://img.youtube.com/vi/${videoId}/${quality}.jpg`,
    width,
    height,
    quality,
  }));
}

function extractMetaProperty(document: cheerio.CheerioAPI, property: string): string | undefined {
  const content = document(`meta[property="${property}"]`).attr("content");
  return content || undefined;
}

function extractMetaName(document: cheerio.CheerioAPI, name: string): string | undefined {
  const content = document(`meta[name="${name}"]`).attr("content");
  return content || undefined;
}

function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
}

export const POST = routeClient
  .body(extractYoutubeMetadataRequestSchema)
  .handler(async (req, { body }): Promise<ExtractYoutubeMetadataResponse> => {
    const { url } = body;
    const posthog = getPostHogClient();
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const distinctId = getPosthogId(ip, userAgent);

    try {
      // Extract video ID from URL
      const videoId = extractVideoId(url);
      if (!videoId) {
        posthog.capture({
          distinctId,
          event: ANALYTICS.TOOL_USED,
          properties: {
            tool_name: "youtube-metadata",
          },
        });

        return {
          success: false,
          error: "Invalid YouTube URL. Please provide a valid YouTube video URL.",
        };
      }

      // Fetch the YouTube page
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        posthog.capture({
          distinctId,
          event: ANALYTICS.TOOL_USED,
          properties: {
            tool_name: "youtube-metadata",
          },
        });

        return {
          success: false,
          error: `Failed to fetch YouTube page: ${response.status} ${response.statusText}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata from various sources
      let title = extractMetaProperty($, "og:title") || 
                  extractMetaName($, "title") || 
                  $("title").text().replace(" - YouTube", "");

      const description = extractMetaProperty($, "og:description") || 
                         extractMetaName($, "description");

      const channelTitle = extractMetaName($, "author");
      
      // Try to extract more detailed information from JSON-LD
      let publishedAt: string | undefined;
      let duration: string | undefined;
      let viewCount: string | undefined;
      let channelId: string | undefined;

      try {
        const scriptTags = $('script[type="application/ld+json"]');
        scriptTags.each((_, element) => {
          try {
            const jsonData = JSON.parse($(element).html() || "");
            if (jsonData["@type"] === "VideoObject") {
              if (jsonData.uploadDate) publishedAt = jsonData.uploadDate;
              if (jsonData.duration) duration = parseISO8601Duration(jsonData.duration);
              if (jsonData.interactionStatistic) {
                const viewStat = jsonData.interactionStatistic.find((stat: unknown) => {
                  const statObj = stat as Record<string, unknown>;
                  return statObj["@type"] === "InteractionCounter" && statObj.interactionType === "WatchAction";
                });
                if (viewStat && typeof viewStat === "object" && viewStat !== null) {
                  const viewStatObj = viewStat as Record<string, unknown>;
                  if (viewStatObj.userInteractionCount) {
                    viewCount = viewStatObj.userInteractionCount.toString();
                  }
                }
              }
            }
          } catch {
            // Ignore parsing errors for individual script tags
          }
        });
      } catch {
        // Ignore JSON-LD parsing errors
      }

      // Try to extract channel ID from canonical URL or other sources
      const canonicalUrl = $('link[rel="canonical"]').attr("href");
      if (canonicalUrl) {
        const channelMatch = canonicalUrl.match(/\/channel\/([a-zA-Z0-9_-]+)/);
        if (channelMatch) channelId = channelMatch[1];
      }

      // Generate thumbnails
      const thumbnails = generateThumbnails(videoId);

      // Clean up title
      if (title.endsWith(" - YouTube")) {
        title = title.slice(0, -10);
      }

      const result = {
        success: true,
        data: {
          videoId,
          title: title || "Untitled Video",
          description,
          channelTitle,
          channelId,
          publishedAt,
          duration,
          viewCount,
          thumbnails,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
      };

      // Track successful usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "youtube-metadata",
        },
      });

      await posthog.shutdown();
      return result;
    } catch (error) {
      console.error("Error extracting YouTube metadata:", error);
      
      // Track error
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "youtube-metadata",
        },
      });

      await posthog.shutdown();
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract YouTube metadata",
      };
    }
  });