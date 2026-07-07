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

export function isTweetUrl(url: string): boolean {
  return url.includes("twitter.com") || url.startsWith("https://x.com/");
}

/** Returns the 11-char YouTube video id, or null when the URL is not a video. */
export function getYouTubeVideoId(url: string): string | null {
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) return null;
  const match = url.match(YOUTUBE_VIDEO_REGEX);
  return match?.[1] ?? null;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
