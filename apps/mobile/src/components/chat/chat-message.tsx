import { Ionicons } from "@expo/vector-icons";
import type { ToolUIPart, UIMessage } from "ai";
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
} from "react-native-enriched-markdown";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Share,
  View,
} from "react-native";

import { useThemeColors } from "../../lib/theme";
import { Text } from "../ui/text";
import {
  ChatBookmarkPreview,
  type ChatBookmark,
} from "./chat-bookmark-preview";
import { getSafeExternalUrl, sanitizeChatMarkdown } from "./safe-markdown";

type ChatMessageProps = {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
  onBookmarkPress: (bookmarkId: string) => void;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getBookmarkOutput(output: unknown): ChatBookmark[] {
  const record = asRecord(output);
  if (!record) return [];

  if (Array.isArray(record.bookmarks)) {
    return record.bookmarks.filter((bookmark): bookmark is ChatBookmark =>
      Boolean(
        asRecord(bookmark) && typeof asRecord(bookmark)?.url === "string",
      ),
    );
  }

  const bookmark = asRecord(record.bookmark);
  return bookmark && typeof bookmark.url === "string"
    ? [bookmark as ChatBookmark]
    : [];
}

async function openSafeExternalUrl(value: string) {
  const url = getSafeExternalUrl(value);
  if (!url) return;

  try {
    await Linking.openURL(url);
  } catch {
    // The OS can reject otherwise valid URLs. The chat remains usable.
  }
}

function ToolStatus({
  icon,
  label,
  loading = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-2 py-1">
      {loading ? (
        <ActivityIndicator size="small" color={colors.mutedForeground} />
      ) : (
        <Ionicons name={icon} size={15} color={colors.mutedForeground} />
      )}
      <Text variant="body-sm" className="flex-1 text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function ReasoningPart({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useThemeColors();

  const markdownStyle = useMemo<MarkdownStyle>(
    () => ({
      paragraph: {
        color: colors.mutedForeground,
        fontFamily: "DMSans_400Regular",
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 8,
      },
      strong: { fontFamily: "DMSans_600SemiBold", fontWeight: "normal" },
      link: { color: colors.primary, underline: true },
      code: {
        color: colors.foreground,
        backgroundColor: colors.secondary,
        borderColor: colors.border,
      },
      codeBlock: {
        color: colors.foreground,
        backgroundColor: colors.secondary,
        borderColor: colors.border,
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
      },
    }),
    [
      colors.border,
      colors.foreground,
      colors.mutedForeground,
      colors.primary,
      colors.secondary,
    ],
  );
  const safeMarkdown = useMemo(() => sanitizeChatMarkdown(text), [text]);

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-secondary/60">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? "Hide reasoning" : "Show reasoning"}
        onPress={() => setExpanded((value) => !value)}
        className="flex-row items-center gap-2 px-3 py-2.5 active:opacity-70"
      >
        <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
        <Text className="flex-1 font-sans-medium text-[13px] text-muted-foreground">
          Thinking process
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={15}
          color={colors.mutedForeground}
        />
      </Pressable>
      {expanded ? (
        <View className="border-t border-border px-3 py-2.5">
          <EnrichedMarkdownText
            markdown={safeMarkdown}
            markdownStyle={markdownStyle}
            enableLinkPreview={false}
            onLinkPress={({ url }) => void openSafeExternalUrl(url)}
            selectable
          />
        </View>
      ) : null}
    </View>
  );
}

function ToolPart({
  part,
  onBookmarkPress,
}: {
  part: ToolUIPart;
  onBookmarkPress: (bookmarkId: string) => void;
}) {
  const colors = useThemeColors();
  const toolName = part.type.replace("tool-", "");
  const isComplete = part.state === "output-available";
  const input = asRecord((part as ToolUIPart & { input?: unknown }).input);
  const output = (part as ToolUIPart & { output?: unknown }).output;
  const outputRecord = asRecord(output);

  if (part.state === "output-error") {
    return (
      <ToolStatus
        icon="alert-circle-outline"
        label={part.errorText || "The action failed"}
      />
    );
  }

  if (part.state === "output-denied") {
    return <ToolStatus icon="remove-circle-outline" label="Action denied" />;
  }

  if (typeof outputRecord?.error === "string") {
    return (
      <ToolStatus icon="alert-circle-outline" label={outputRecord.error} />
    );
  }

  if (toolName === "showBookmarks" || toolName === "showBookmark") {
    if (!isComplete) {
      return (
        <ToolStatus
          icon="bookmark-outline"
          label="Loading bookmarks…"
          loading
        />
      );
    }

    const bookmarks = getBookmarkOutput(output);
    if (bookmarks.length === 0) {
      return (
        <ToolStatus icon="alert-circle-outline" label="No bookmarks found" />
      );
    }

    return (
      <View className="gap-2.5 py-1">
        {bookmarks.map((bookmark, index) => (
          <ChatBookmarkPreview
            key={bookmark.id ?? `${bookmark.url}-${index}`}
            bookmark={bookmark}
            onPress={onBookmarkPress}
          />
        ))}
      </View>
    );
  }

  if (toolName === "searchBookmarks") {
    const query =
      typeof input?.query === "string" ? input.query : "your bookmarks";
    const resultCount = Array.isArray(output) ? output.length : null;
    return (
      <ToolStatus
        icon={isComplete ? "checkmark-circle-outline" : "search-outline"}
        label={
          isComplete
            ? `Found ${resultCount ?? 0} result${resultCount === 1 ? "" : "s"} for “${query}”`
            : `Searching for “${query}”…`
        }
        loading={!isComplete}
      />
    );
  }

  if (toolName === "getBookmark") {
    return (
      <ToolStatus
        icon={isComplete ? "checkmark-circle-outline" : "document-text-outline"}
        label={
          isComplete ? "Loaded bookmark details" : "Loading bookmark details…"
        }
        loading={!isComplete}
      />
    );
  }

  if (toolName === "updateTags") {
    return (
      <ToolStatus
        icon={isComplete ? "checkmark-circle-outline" : "pricetags-outline"}
        label={isComplete ? "Bookmark tags updated" : "Updating bookmark tags…"}
        loading={!isComplete}
      />
    );
  }

  if (toolName === "downloadBookmarks") {
    const filename =
      typeof outputRecord?.filename === "string" ? outputRecord.filename : null;
    const content =
      typeof outputRecord?.content === "string" ? outputRecord.content : null;

    if (isComplete && content) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${filename ?? "bookmark export"}`}
          onPress={() =>
            void Share.share({
              title: filename ?? "SaveIt bookmarks",
              message: content,
            })
          }
          className="flex-row items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 active:opacity-70"
        >
          <Ionicons name="share-outline" size={16} color={colors.primary} />
          <Text className="flex-1 font-sans-medium text-[13px] text-foreground">
            Share {filename ?? "bookmark export"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={15}
            color={colors.mutedForeground}
          />
        </Pressable>
      );
    }

    return (
      <ToolStatus
        icon={isComplete ? "checkmark-circle-outline" : "download-outline"}
        label={
          isComplete ? (filename ?? "Export prepared") : "Preparing export…"
        }
        loading={!isComplete}
      />
    );
  }

  return (
    <ToolStatus
      icon={isComplete ? "checkmark-circle-outline" : "sparkles-outline"}
      label={isComplete ? "Action completed" : "Working…"}
      loading={!isComplete}
    />
  );
}

export function ChatMessage({
  message,
  isLast,
  isStreaming,
  onBookmarkPress,
}: ChatMessageProps) {
  const colors = useThemeColors();
  const isUser = message.role === "user";
  const parts = message.parts ?? [];
  const showPending =
    !isUser &&
    isLast &&
    isStreaming &&
    parts.every((part) => part.type !== "text");

  const markdownStyle = useMemo<MarkdownStyle>(
    () => ({
      paragraph: {
        color: colors.foreground,
        fontFamily: "DMSans_400Regular",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 10,
      },
      h1: {
        color: colors.foreground,
        fontFamily: "DMSans_700Bold",
        fontSize: 23,
        lineHeight: 29,
        marginBottom: 10,
      },
      h2: {
        color: colors.foreground,
        fontFamily: "DMSans_700Bold",
        fontSize: 20,
        lineHeight: 26,
        marginBottom: 8,
      },
      h3: {
        color: colors.foreground,
        fontFamily: "DMSans_600SemiBold",
        fontSize: 17,
        lineHeight: 23,
        marginBottom: 6,
      },
      strong: { fontFamily: "DMSans_700Bold", fontWeight: "normal" },
      emphasis: { fontFamily: "DMSans_400Regular" },
      link: { color: colors.primary, underline: true },
      list: {
        color: colors.foreground,
        fontFamily: "DMSans_400Regular",
        fontSize: 15,
        lineHeight: 22,
        bulletColor: colors.primary,
        markerColor: colors.primary,
        gapWidth: 8,
      },
      blockquote: {
        color: colors.mutedForeground,
        borderColor: colors.primary,
        borderWidth: 3,
        gapWidth: 10,
        backgroundColor: colors.secondary,
      },
      code: {
        color: colors.foreground,
        backgroundColor: colors.secondary,
        borderColor: colors.border,
      },
      codeBlock: {
        color: colors.foreground,
        backgroundColor: colors.secondary,
        borderColor: colors.border,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
      },
    }),
    [
      colors.border,
      colors.foreground,
      colors.mutedForeground,
      colors.primary,
      colors.secondary,
    ],
  );

  return (
    <View className={isUser ? "items-end" : "items-stretch"}>
      <View
        className={
          isUser
            ? "max-w-[86%] rounded-2xl rounded-br-md bg-primary px-4 py-3"
            : "gap-2.5"
        }
      >
        {parts.map((part, index) => {
          if (part.type === "text") {
            const safeMarkdown = sanitizeChatMarkdown(part.text);
            return isUser ? (
              <Text
                key={`${message.id}-text-${index}`}
                className="font-sans text-[15px] leading-[21px] text-primary-foreground"
              >
                {part.text}
              </Text>
            ) : (
              <EnrichedMarkdownText
                key={`${message.id}-text-${index}`}
                markdown={safeMarkdown}
                markdownStyle={markdownStyle}
                enableLinkPreview={false}
                onLinkPress={({ url }) => void openSafeExternalUrl(url)}
                selectable
                streamingAnimation={isLast && isStreaming}
              />
            );
          }

          if (part.type === "reasoning") {
            return (
              <ReasoningPart
                key={`${message.id}-reasoning-${index}`}
                text={part.text}
              />
            );
          }

          if (part.type.startsWith("tool-")) {
            return (
              <ToolPart
                key={`${message.id}-tool-${index}`}
                part={part as ToolUIPart}
                onBookmarkPress={onBookmarkPress}
              />
            );
          }

          return null;
        })}

        {showPending ? (
          <ToolStatus icon="sparkles-outline" label="Thinking…" loading />
        ) : null}
      </View>
    </View>
  );
}
