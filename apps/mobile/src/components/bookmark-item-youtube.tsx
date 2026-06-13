import { useWindowDimensions, View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

import { type Bookmark } from "../lib/api-client";
import { CardActionButton } from "./bookmark-item";

interface BookmarkItemYoutubeProps {
  bookmark: Bookmark;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

export function BookmarkItemYoutube({
  bookmark,
  onToggleStar,
  onToggleRead,
}: BookmarkItemYoutubeProps) {
  const { width } = useWindowDimensions();
  const youtubeId = bookmark.metadata?.youtubeId;
  const playerWidth = width - 48;
  const playerHeight = Math.round(playerWidth * (9 / 16));

  if (!youtubeId) {
    return null;
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <YoutubePlayer
        height={playerHeight}
        videoId={youtubeId}
        webViewProps={{
          scrollEnabled: false,
          showsVerticalScrollIndicator: false,
          showsHorizontalScrollIndicator: false,
          overScrollMode: "never",
          bounces: false,
          style: { overflow: "hidden" },
        }}
      />
      <View className="absolute right-2 top-2 flex-row gap-1.5">
        <CardActionButton
          icon={bookmark.starred ? "star" : "star-outline"}
          color={bookmark.starred ? "#F59E0B" : undefined}
          onPress={onToggleStar}
        />
        <CardActionButton
          icon={bookmark.read ? "checkmark-circle" : "ellipse-outline"}
          color={bookmark.read ? "#10B981" : undefined}
          onPress={onToggleRead}
        />
      </View>
    </View>
  );
}
