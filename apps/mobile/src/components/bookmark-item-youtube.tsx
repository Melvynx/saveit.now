import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { type Bookmark } from "../lib/api-client";
import { useThemeColors } from "../lib/theme";
import { CardActionButton } from "./bookmark-item";
import { YouTubeEmbed } from "./youtube-embed";

interface BookmarkItemYoutubeProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

function BookmarkYoutubeFooter({
  bookmark,
  onPress,
}: Pick<BookmarkItemYoutubeProps, "bookmark" | "onPress">) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open bookmark details: ${bookmark.title || "YouTube video"}`}
      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-secondary active:opacity-80"
    >
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={2}
          className="font-sans-semibold text-[15px] text-foreground"
        >
          {bookmark.title || "YouTube video"}
        </Text>
        <Text className="font-sans text-[12px] text-muted-foreground">
          View details
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={17}
        color={colors.mutedForeground}
      />
    </Pressable>
  );
}

export function BookmarkItemYoutube({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemYoutubeProps) {
  const { width } = useWindowDimensions();
  const youtubeId = bookmark.metadata?.youtubeId;
  const playerWidth = width - 48;

  if (!youtubeId) {
    return null;
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <YouTubeEmbed
        videoId={youtubeId}
        posterUrl={bookmark.preview}
        availableWidth={playerWidth}
      />
      <View className="absolute right-2 top-2 flex-row gap-1.5">
        <CardActionButton
          icon={bookmark.starred ? "star" : "star-outline"}
          color={bookmark.starred ? "#F59E0B" : undefined}
          accessibilityLabel={
            bookmark.starred ? "Remove bookmark from starred" : "Star bookmark"
          }
          onPress={onToggleStar}
        />
        <CardActionButton
          icon={bookmark.read ? "checkmark-circle" : "ellipse-outline"}
          color={bookmark.read ? "#10B981" : undefined}
          accessibilityLabel={
            bookmark.read ? "Mark bookmark as unread" : "Mark bookmark as read"
          }
          onPress={onToggleRead}
        />
      </View>
      <BookmarkYoutubeFooter bookmark={bookmark} onPress={onPress} />
    </View>
  );
}
