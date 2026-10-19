import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";

export type BookmarkDetailMode = "dialog" | "page";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDetailDate(timestamp: number) {
  return dateFormatter.format(new Date(timestamp));
}

export function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const TYPE_LABELS: Record<string, string> = {
  ARTICLE: "Article",
  PAGE: "Page",
  VIDEO: "Video",
  YOUTUBE: "Video",
  TWEET: "Tweet",
  IMAGE: "Image",
  PDF: "PDF",
  PRODUCT: "Product",
};

export function getTypeLabel(type: BookmarkDetailDTO["type"]) {
  return TYPE_LABELS[type ?? "PAGE"] ?? "Page";
}

/** Read state only applies to long-form content (mirrors bulkUpdate). */
export function supportsReadState(type: BookmarkDetailDTO["type"]) {
  return type === "ARTICLE" || type === "YOUTUBE";
}

export function isProcessing(status: BookmarkDetailDTO["status"]) {
  return status === "PENDING" || status === "PROCESSING";
}

export function getReaderUrl(bookmark: BookmarkDetailDTO) {
  const markdown = bookmark.metadata?.markdown;
  return typeof markdown === "string" && markdown.length > 0
    ? `/p/${bookmark.id}/read`
    : undefined;
}

export function getAskAiQuestion(bookmark: BookmarkDetailDTO) {
  const title = bookmark.title?.trim() || getDomain(bookmark.url);
  return `What are the key takeaways of "${title}"?`;
}

export function toMarkdown(bookmark: BookmarkDetailDTO) {
  const title = bookmark.title?.trim() || getDomain(bookmark.url);
  const lines = [`[${title}](${bookmark.url})`];
  const summary = bookmark.summary?.trim();
  if (summary) {
    lines.push("", ...summary.split("\n").map((line) => `> ${line}`));
  }
  const tags = bookmark.tags.map(({ tag }) => `#${tag.name}`);
  if (tags.length > 0) lines.push("", tags.join(" "));
  const note = bookmark.note?.trim();
  if (note) lines.push("", note);
  return lines.join("\n");
}
