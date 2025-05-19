import * as cheerio from "cheerio";

/**
 * Checks if a URL is from a known video platform
 * @param url The URL to check
 * @returns Boolean indicating if the URL is from a video platform
 */
export function checkIfVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check for known video platforms
    if (
      hostname.includes("youtube.com") ||
      hostname.includes("youtu.be") ||
      hostname.includes("vimeo.com") ||
      hostname.includes("loom.com") ||
      hostname.includes("tella.tv") ||
      hostname.includes("wistia.com") ||
      hostname.includes("dailymotion.com") ||
      hostname.includes("twitch.tv") ||
      hostname.includes("facebook.com/watch") ||
      (hostname.includes("twitter.com") && url.includes("/video/")) ||
      (hostname.includes("instagram.com") && url.includes("/reel/")) ||
      hostname.includes("tiktok.com")
    ) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return false;
  }
}

/**
 * Checks if a page contains video embeds
 * @param $ Cheerio instance loaded with the page content
 * @returns Boolean indicating if the page contains video embeds
 */
export function checkForVideoEmbeds($: cheerio.CheerioAPI): boolean {
  // Check for video elements
  const hasVideoElement = $("video").length > 0;

  // Check for common video embeds
  const hasYouTubeEmbed =
    $("iframe[src*='youtube.com']").length > 0 ||
    $("iframe[src*='youtu.be']").length > 0;

  const hasVimeoEmbed = $("iframe[src*='vimeo.com']").length > 0;

  const hasLoomEmbed = $("iframe[src*='loom.com']").length > 0;

  // Check for video metadata
  const hasVideoMetadata =
    $("meta[property='og:video']").length > 0 ||
    $("meta[property='og:video:url']").length > 0 ||
    $("meta[property='og:video:secure_url']").length > 0 ||
    $("meta[property='og:video:type']").length > 0;

  return (
    hasVideoElement ||
    hasYouTubeEmbed ||
    hasVimeoEmbed ||
    hasLoomEmbed ||
    hasVideoMetadata
  );
}
