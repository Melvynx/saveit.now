import {
  captureToolUsage,
  TOOL_USER_AGENT,
  toolErrorResponse,
} from "@/lib/tools/tool-route-utils";
import {
  extractYoutubeMetadataRequestSchema,
  type ExtractYoutubeMetadataResponse,
  type YoutubeThumbnail,
} from "@/lib/tools/schemas/youtube-metadata";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(url: string) {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function generateThumbnails(videoId: string): YoutubeThumbnail[] {
  const thumbnailQualities: Array<Omit<YoutubeThumbnail, "url">> = [
    { quality: "default", width: 120, height: 90 },
    { quality: "mqdefault", width: 320, height: 180 },
    { quality: "hqdefault", width: 480, height: 360 },
    { quality: "sddefault", width: 640, height: 480 },
    { quality: "maxresdefault", width: 1280, height: 720 },
  ];

  return thumbnailQualities.map((thumbnail) => ({
    ...thumbnail,
    url: `https://img.youtube.com/vi/${videoId}/${thumbnail.quality}.jpg`,
  }));
}

function parseISO8601Duration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

function extractMetaProperty(document: cheerio.CheerioAPI, property: string) {
  return document(`meta[property="${property}"]`).attr("content") ?? undefined;
}

function extractMetaName(document: cheerio.CheerioAPI, name: string) {
  return document(`meta[name="${name}"]`).attr("content") ?? undefined;
}

export const Route = createFileRoute("/api/tools/youtube-metadata")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = extractYoutubeMetadataRequestSchema.parse(
            await request.json(),
          );
          const videoId = extractVideoId(url);
          if (!videoId) {
            const result: ExtractYoutubeMetadataResponse = {
              success: false,
              error:
                "Invalid YouTube URL. Please provide a valid YouTube video URL.",
            };
            await captureToolUsage(request, "youtube-metadata");
            return Response.json(result);
          }

          const response = await fetch(
            `https://www.youtube.com/watch?v=${videoId}`,
            {
              headers: {
                "User-Agent": TOOL_USER_AGENT,
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                DNT: "1",
              },
            },
          );

          if (!response.ok) {
            const result: ExtractYoutubeMetadataResponse = {
              success: false,
              error: `Failed to fetch YouTube page: ${response.status} ${response.statusText}`,
            };
            await captureToolUsage(request, "youtube-metadata");
            return Response.json(result);
          }

          const $ = cheerio.load(await response.text());
          let title =
            extractMetaProperty($, "og:title") ??
            extractMetaName($, "title") ??
            $("title").text().replace(" - YouTube", "");
          const description =
            extractMetaProperty($, "og:description") ??
            extractMetaName($, "description");
          const channelTitle = extractMetaName($, "author");
          let publishedAt: string | undefined;
          let duration: string | undefined;
          let viewCount: string | undefined;
          let channelId: string | undefined;

          $('script[type="application/ld+json"]').each((_, element) => {
            try {
              const data = JSON.parse($(element).html() ?? "");
              if (data["@type"] !== "VideoObject") return;
              publishedAt = data.uploadDate ?? publishedAt;
              duration = data.duration
                ? parseISO8601Duration(data.duration)
                : duration;
              const viewStat = data.interactionStatistic?.find(
                (stat: Record<string, unknown>) =>
                  stat["@type"] === "InteractionCounter" &&
                  stat.interactionType === "WatchAction",
              );
              if (viewStat?.userInteractionCount) {
                viewCount = String(viewStat.userInteractionCount);
              }
            } catch {
              // Ignore invalid embedded JSON.
            }
          });

          const canonicalUrl = $('link[rel="canonical"]').attr("href");
          const channelMatch = canonicalUrl?.match(
            /\/channel\/([a-zA-Z0-9_-]+)/,
          );
          if (channelMatch?.[1]) channelId = channelMatch[1];
          if (title.endsWith(" - YouTube")) title = title.slice(0, -10);

          const result: ExtractYoutubeMetadataResponse = {
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
              thumbnails: generateThumbnails(videoId),
              url: `https://www.youtube.com/watch?v=${videoId}`,
            },
          };

          await captureToolUsage(request, "youtube-metadata");
          return Response.json(result);
        } catch (error) {
          await captureToolUsage(request, "youtube-metadata");
          return toolErrorResponse(error);
        }
      },
    },
  },
});
