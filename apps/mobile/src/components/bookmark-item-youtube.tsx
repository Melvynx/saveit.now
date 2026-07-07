import { type ComponentType } from "react";
import { Image, Text, useWindowDimensions, View } from "react-native";

import { type Bookmark } from "../lib/api-client";
import { CardActionButton } from "./bookmark-item";

type YoutubePlayerProps = {
  height: number;
  videoId: string;
  webViewProps?: Record<string, unknown>;
};

let resolvedYoutubePlayer:
  | ComponentType<YoutubePlayerProps>
  | null
  | undefined;

function getYoutubePlayer() {
  if (resolvedYoutubePlayer !== undefined) {
    return resolvedYoutubePlayer;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const youtubeIframe = require("react-native-youtube-iframe") as {
      default?: ComponentType<YoutubePlayerProps>;
    };
    resolvedYoutubePlayer = youtubeIframe.default ?? null;
  } catch {
    resolvedYoutubePlayer = null;
  }

  return resolvedYoutubePlayer;
}

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
  const YoutubePlayer = getYoutubePlayer();
  const playerWidth = width - 48;
  const playerHeight = Math.round(playerWidth * (9 / 16));

  if (!youtubeId) {
    return null;
  }

  if (!YoutubePlayer) {
    return (
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <Image
          source={{
            uri:
              bookmark.preview ||
              `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
          }}
          style={{ height: playerHeight, width: "100%" }}
          resizeMode="cover"
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
        <View className="px-4 py-3.5">
          <Text
            numberOfLines={2}
            className="font-sans-semibold text-[15px] text-foreground"
          >
            {bookmark.title}
          </Text>
        </View>
      </View>
    );
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
