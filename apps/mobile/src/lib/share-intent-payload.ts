import type { ShareIntent } from "expo-share-intent";

export type ShareIntentPayload = {
  url: string;
  title: string | null;
  metadata: Record<string, unknown>;
};

export type ShareIntentPayloadErrorCode =
  | "empty"
  | "unsupported-file"
  | "unsupported-text"
  | "invalid-url";

export type ShareIntentPayloadError = {
  code: ShareIntentPayloadErrorCode;
  title: string;
  message: string;
};

export type ShareIntentPayloadResult =
  | { ok: true; payload: ShareIntentPayload }
  | { ok: false; error: ShareIntentPayloadError };

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const WWW_URL_PATTERN = /\bwww\.[^\s<>"']+/i;
const TRAILING_PUNCTUATION = /[.,:;!?'"<>]+$/;

function stripTrailingPunctuation(value: string) {
  let result = value.trim().replace(TRAILING_PUNCTUATION, "");

  while (/[)\]}]$/.test(result)) {
    const close = result[result.length - 1]!;
    const open = close === ")" ? "(" : close === "]" ? "[" : "{";
    const openCount = result.split(open).length - 1;
    const closeCount = result.split(close).length - 1;
    if (closeCount <= openCount) break;
    result = result.slice(0, -1).replace(TRAILING_PUNCTUATION, "");
  }

  return result;
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const candidate = stripTrailingPunctuation(value);
  const withProtocol = candidate.startsWith("www.")
    ? `https://${candidate}`
    : candidate;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function findUrlInText(text: string | null | undefined): string | null {
  if (!text) return null;

  const matches = text.match(HTTP_URL_PATTERN) ?? [];
  for (const match of matches) {
    const normalized = normalizeHttpUrl(match);
    if (normalized) return normalized;
  }

  const wwwMatch = text.match(WWW_URL_PATTERN)?.[0];
  return normalizeHttpUrl(wwwMatch);
}

function titleFromShareIntent(shareIntent: ShareIntent, url: string) {
  const metaTitle = shareIntent.meta?.title?.trim();
  if (metaTitle) return metaTitle;

  const text = shareIntent.text?.replace(url, "").trim();
  return text || null;
}

function getFileError(shareIntent: ShareIntent): ShareIntentPayloadError {
  const firstFile = shareIntent.files?.[0];
  const mimeType = firstFile?.mimeType ?? "";
  const isVideo = mimeType.startsWith("video/");

  return {
    code: "unsupported-file",
    title: isVideo ? "Share the video link" : "Share a link instead",
    message: isVideo
      ? "SaveIt can save video links from Safari, YouTube, TikTok, X, and other apps. Direct video file uploads are not supported from iOS share yet."
      : "SaveIt currently saves links from iOS share. Direct file uploads are not supported from this flow yet.",
  };
}

export function getShareIntentPayload(
  shareIntent: ShareIntent,
): ShareIntentPayloadResult {
  const url =
    normalizeHttpUrl(shareIntent.webUrl) ?? findUrlInText(shareIntent.text);

  if (!url && shareIntent.files?.length) {
    return { ok: false, error: getFileError(shareIntent) };
  }

  if (!url && shareIntent.text?.trim()) {
    return {
      ok: false,
      error: {
        code: "unsupported-text",
        title: "No link found",
        message:
          "This share only contains text. Share a webpage or video link to save it in SaveIt.",
      },
    };
  }

  if (!url) {
    return {
      ok: false,
      error: {
        code: "empty",
        title: "Nothing to save",
        message: "SaveIt could not find a link in this share.",
      },
    };
  }

  const title = titleFromShareIntent(shareIntent, url);

  return {
    ok: true,
    payload: {
      url,
      title,
      metadata: {
        source: "ios-share-extension",
        shareType: shareIntent.type ?? "unknown",
        ...(title ? { title } : {}),
      },
    },
  };
}
