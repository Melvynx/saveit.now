import type { ToolUIPart, UIMessage } from "ai";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";

export type ChatSource = Pick<
  BookmarkCardData,
  "id" | "url" | "title" | "summary" | "ogImageUrl" | "faviconUrl" | "preview"
> & {
  type?: string | null;
  ogDescription?: string | null;
};

export type ConversationListItem = {
  _id: string;
  title: string | null;
  updatedAt: number;
  createdAt: number;
  likes: number;
};

export type ConversationGroup = {
  label: string;
  items: ConversationListItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function groupConversations(
  conversations: ConversationListItem[],
  now = new Date(),
): ConversationGroup[] {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = today - DAY_MS;
  const weekAgo = today - 7 * DAY_MS;

  const groups: ConversationGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conversation of conversations) {
    const time = conversation.updatedAt;
    const index =
      time >= today ? 0 : time >= yesterday ? 1 : time >= weekAgo ? 2 : 3;
    groups[index]?.items.push(conversation);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function getMessageText(message: UIMessage) {
  return (message.parts ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim();
}

export function getFirstUserMessageText(messages: UIMessage[]) {
  const first = messages.find((message) => message.role === "user");
  return (first && getMessageText(first)) || "New conversation";
}

export function getToolName(part: { type: string }) {
  return part.type.startsWith("tool-") ? part.type.slice(5) : null;
}

/** Bookmarks the assistant chose to show, in display order, deduped. */
export function getMessageSources(message: UIMessage): ChatSource[] {
  const seen = new Set<string>();
  const sources: ChatSource[] = [];

  for (const part of message.parts ?? []) {
    const toolName = getToolName(part);
    if (toolName !== "showBookmarks" && toolName !== "showBookmark") continue;
    const tool = part as ToolUIPart;
    if (tool.state !== "output-available") continue;

    const output = tool.output as
      | { bookmarks?: ChatSource[]; bookmark?: ChatSource }
      | undefined;
    const items =
      toolName === "showBookmarks"
        ? (output?.bookmarks ?? [])
        : output?.bookmark
          ? [output.bookmark]
          : [];

    for (const item of items) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      sources.push(item);
    }
  }

  return sources;
}

export function getSourcesTitle(message: UIMessage) {
  for (const part of message.parts ?? []) {
    if (getToolName(part) !== "showBookmarks") continue;
    const tool = part as ToolUIPart;
    const title = (tool.input as { title?: string } | undefined)?.title;
    if (title) return title;
  }
  return null;
}

export function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getSourceTitle(source: ChatSource) {
  return (
    source.title?.trim() ||
    source.ogDescription?.trim() ||
    source.summary?.trim() ||
    getDomain(source.url)
  );
}

export function sourcesToMarkdown(sources: ChatSource[]) {
  return sources
    .map((source) => `- [${getSourceTitle(source)}](${source.url})`)
    .join("\n");
}
