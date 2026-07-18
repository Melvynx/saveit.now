import {
  MAX_TRANSCRIPT_LENGTH,
  MAX_URL_LENGTH,
  type SaveType,
} from "./domain.ts";

export { MAX_TRANSCRIPT_LENGTH };

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const DIRECT_IMAGE_EXTENSION_PATTERN =
  /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;
const DIRECT_IMAGE_HOSTS = new Set([
  "cdn.pixabay.com",
  "i.imgur.com",
  "images.unsplash.com",
  "media.giphy.com",
  "pbs.twimg.com",
]);

function parseSaveableUrl(value: unknown): URL | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URL_LENGTH ||
    value !== value.trim()
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    if (
      (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") ||
      parsedUrl.username !== "" ||
      parsedUrl.password !== ""
    ) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
}

function isHostOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getPathVideoId(parsedUrl: URL): string | null {
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathParts.length !== 2) return null;

  const [route, videoId] = pathParts;
  if (!route || !videoId) return null;
  if (!["embed", "live", "shorts", "v"].includes(route)) return null;

  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

function isTwitterOrXUrl(url: string): boolean {
  const parsedUrl = parseSaveableUrl(url);
  if (!parsedUrl) return false;

  return (
    isHostOrSubdomain(parsedUrl.hostname, "twitter.com") ||
    isHostOrSubdomain(parsedUrl.hostname, "x.com")
  );
}

function isDirectImageUrl(url: string): boolean {
  const parsedUrl = parseSaveableUrl(url);
  if (!parsedUrl) return false;

  return (
    DIRECT_IMAGE_EXTENSION_PATTERN.test(parsedUrl.pathname) ||
    DIRECT_IMAGE_HOSTS.has(parsedUrl.hostname)
  );
}

export function isSaveableUrl(value: unknown): value is string {
  return parseSaveableUrl(value) !== null;
}

export function getYouTubeVideoId(url: string): string | null {
  const parsedUrl = parseSaveableUrl(url);
  if (!parsedUrl) return null;

  if (parsedUrl.hostname === "youtu.be") {
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const videoId = pathParts.length === 1 ? pathParts[0] : null;
    return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  if (!isHostOrSubdomain(parsedUrl.hostname, "youtube.com")) return null;

  if (parsedUrl.pathname === "/watch") {
    const videoId = parsedUrl.searchParams.get("v");
    return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  }

  return getPathVideoId(parsedUrl);
}

export function isYouTubeVideoUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
}

export function isSameDocumentUrl(
  targetUrl: string,
  sourceUrl: string,
): boolean {
  const target = parseSaveableUrl(targetUrl);
  const source = parseSaveableUrl(sourceUrl);
  if (!target || !source) return false;

  target.hash = "";
  source.hash = "";
  return target.href === source.href;
}

export function shouldUsePageContext(
  type: SaveType,
  targetUrl: string,
  sourceUrl: string,
): boolean {
  return type === "page" && isSameDocumentUrl(targetUrl, sourceUrl);
}

export function shouldCaptureClientPreview(
  type: SaveType,
  targetUrl: string,
  sourceUrl: string,
): boolean {
  return (
    shouldUsePageContext(type, targetUrl, sourceUrl) &&
    !isYouTubeVideoUrl(targetUrl) &&
    !isTwitterOrXUrl(targetUrl) &&
    !isDirectImageUrl(targetUrl)
  );
}
