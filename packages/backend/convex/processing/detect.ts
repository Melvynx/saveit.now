/**
 * processing/detect.ts — pure URL routing helpers + step constants.
 *
 * No runtime directive: this module is imported by both the V8 workflow
 * (workflow.ts) and Node actions (steps.ts), so it must stay side-effect free.
 */

/**
 * Processing step numbers (drive the reactive pending-card UI;
 * mirrored in apps/web/src/lib/bookmark-steps.ts).
 */
export const STEP = {
  pending: 0,
  getBookmark: 1,
  scrapContent: 2,
  extractMetadata: 3,
  summaryPage: 4,
  findTags: 5,
  screenshot: 6,
  saving: 7,
  finish: 8,
  transcriptVideo: 9,
  describeScreenshot: 10,
  getTweet: 11,
} as const;

const YOUTUBE_VIDEO_REGEX =
  /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

const TWEET_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

/**
 * Returns the numeric status id of an X/Twitter post URL, or undefined for
 * every other X URL (profiles, /home, /search, lists). Tolerates trailing
 * segments such as `/photo/1`, `/video/1` or `/analytics`.
 */
export function getTweetId(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!TWEET_HOSTS.has(parsed.hostname.toLowerCase())) return undefined;
  return parsed.pathname.match(/\/status(?:es)?\/(\d{5,25})(?:\/|$)/)?.[1];
}

export function isTweetUrl(url: string): boolean {
  return getTweetId(url) !== undefined;
}

const BOT_WALL_TITLE =
  /just a moment|attention required|making sure you'?re not a bot|access denied|are you a robot|verify you are human|security check|captcha|ddos-guard|request blocked|^blocked$|you'?ve been blocked|403 forbidden|pardon our interruption/i;

// A dead or login-walled page would replace the URL-based fallback title
// with "404 Not Found" / "Sign in", which is worse than no content.
const DEAD_PAGE_TITLE =
  /\b404\b|page not found|^not found\b|profile not found|(?:^|[:|·–-]\s*)(?:sign[ -]?in|log[ -]?in)\s*$|^(?:sign[ -]?in|log[ -]?in)\s*[:|·–-]/i;

/**
 * Whether HTML rendered by a headless browser holds real page content rather
 * than a bot-protection interstitial, a 404/login page or an empty shell.
 */
export function isUsableRenderedHtml(html: string): boolean {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  if (BOT_WALL_TITLE.test(title) || DEAD_PAGE_TITLE.test(title)) return false;
  const text = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 200;
}

const REDDIT_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "new.reddit.com",
  "m.reddit.com",
  "np.reddit.com",
]);

/**
 * Reddit answers 403 to server IPs for HTML and `.json`, but still serves
 * oEmbed for posts. Returns the oEmbed endpoint for a post URL, else null.
 */
export function getRedditPost(
  url: string,
): { oembedUrl: string; subreddit: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!REDDIT_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const match = parsed.pathname.match(/^\/r\/([^/]+)\/comments\/([a-z0-9]+)/i);
  const [, subreddit, postId] = match ?? [];
  if (!subreddit || !postId) return null;
  const canonical = `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
  return {
    oembedUrl: `https://www.reddit.com/oembed?url=${encodeURIComponent(canonical)}`,
    subreddit,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal page the regular PAGE pipeline can summarize and tag. */
export function buildRedditPostHtml(post: {
  title: string;
  author?: string;
  subreddit: string;
}): string {
  const title = escapeHtml(post.title);
  const byline = escapeHtml(
    `Reddit post${post.author ? ` by u/${post.author}` : ""} in r/${post.subreddit}`,
  );
  return `<html><head><title>${title}</title><meta property="og:title" content="${title}"><meta property="og:description" content="${byline}"></head><body><h1>${title}</h1><p>${byline}.</p></body></html>`;
}

/**
 * Resolves an href/src found in a page against the page URL, the way a
 * browser would (`images/a.jpg`, `../a.jpg`, `//cdn/a.jpg`, `/a.jpg`).
 * Returns null for empty, unparsable or non-http(s) values such as `data:`.
 */
export function resolveAssetUrl(
  href: string | null | undefined,
  pageUrl: string,
): string | null {
  const value = href?.trim();
  if (!value) return null;
  try {
    const resolved = new URL(value, pageUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? resolved.href
      : null;
  } catch {
    return null;
  }
}

/** Returns the 11-char YouTube video id, or null when the URL is not a video. */
export function getYouTubeVideoId(url: string): string | null {
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) return null;
  const match = url.match(YOUTUBE_VIDEO_REGEX);
  return match?.[1] ?? null;
}

const PROCESSING_ERROR_FALLBACK = "We couldn't process this link.";

/**
 * Workflow failures arrive as "Error: Uncaught Error: <msg>\n    at handler
 * (../../convex/…)". Keep only the human sentence for the bookmark card.
 * Shared with the web app, which also cleans rows stored before this existed.
 */
export function toUserFacingProcessingError(
  raw: string | null | undefined,
): string {
  const firstLine = (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("at "));
  if (!firstLine) return PROCESSING_ERROR_FALLBACK;

  const message = firstLine
    .replace(/\[Request ID: [^\]]+\]\s*/g, "")
    .replace(/\b(?:Uncaught\s+)?(?:Convex)?Error:\s*/g, "")
    .replace(/\{.*\}/, extractConvexErrorMessage)
    .trim();
  return message || PROCESSING_ERROR_FALLBACK;
}

/** ConvexError data surfaces as `{"code":"…","message":"…"}` in workflow errors. */
function extractConvexErrorMessage(json: string): string {
  try {
    const data: unknown = JSON.parse(json);
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  } catch {
    // not JSON — keep the original text
  }
  return json;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
