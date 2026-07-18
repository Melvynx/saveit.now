import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { useThemeColors } from "../../lib/theme";
import { getDomainName } from "../../lib/utils";
import { Text } from "../ui/text";

export type ChatBookmark = {
  id?: string;
  url: string;
  type?: string | null;
  title?: string | null;
  summary?: string | null;
  ogImageUrl?: string | null;
  faviconUrl?: string | null;
  preview?: string | null;
};

type ChatBookmarkPreviewProps = {
  bookmark: ChatBookmark;
  onPress: (bookmarkId: string) => void;
};

export function ChatBookmarkPreview({
  bookmark,
  onPress,
}: ChatBookmarkPreviewProps) {
  const colors = useThemeColors();
  const title = bookmark.title?.trim() || getDomainName(bookmark.url);
  const domain = getDomainName(bookmark.url);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open bookmark: ${title}`}
      disabled={!bookmark.id}
      onPress={() => bookmark.id && onPress(bookmark.id)}
      className="flex-row overflow-hidden rounded-2xl border border-border bg-card active:opacity-80"
    >
      <View className="w-[92px] items-center justify-center bg-secondary">
        <Ionicons name="bookmark" size={24} color={colors.primary} />
      </View>

      <View className="min-h-[92px] flex-1 justify-center gap-1 px-3 py-2.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="globe-outline" size={14} color={colors.primary} />
          <Text numberOfLines={1} variant="caption" className="flex-1">
            {domain}
          </Text>
          {bookmark.type ? (
            <Text className="rounded-full bg-secondary px-2 py-0.5 font-sans-semibold text-[10px] text-muted-foreground">
              {bookmark.type.toLowerCase()}
            </Text>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          className="font-sans-semibold text-[14px] leading-[18px] text-foreground"
        >
          {title}
        </Text>
        {bookmark.summary ? (
          <Text numberOfLines={1} variant="caption">
            {bookmark.summary}
          </Text>
        ) : null}
      </View>

      <View className="justify-center pr-3">
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
        />
      </View>
    </Pressable>
  );
}
