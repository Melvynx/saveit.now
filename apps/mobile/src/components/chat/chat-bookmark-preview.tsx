import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { getDomainName } from "../../lib/utils";
import { Text } from "../ui/text";

const PLACEHOLDER_PREVIEW =
  "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";

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
  const title = bookmark.title?.trim() || getDomainName(bookmark.url);
  const image =
    bookmark.preview || bookmark.ogImageUrl || PLACEHOLDER_PREVIEW;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open bookmark: ${title}`}
      disabled={!bookmark.id}
      onPress={() => bookmark.id && onPress(bookmark.id)}
      className="flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2 active:opacity-80"
    >
      <Image
        source={{ uri: image }}
        placeholder={{ uri: PLACEHOLDER_PREVIEW }}
        style={{ width: 96, height: 72, borderRadius: 12 }}
        contentFit="cover"
        transition={200}
      />

      <View className="flex-1 pr-1">
        <Text
          numberOfLines={2}
          className="font-sans-semibold text-[15px] leading-[20px] text-foreground"
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
