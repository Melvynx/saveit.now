import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { type Bookmark } from "../lib/api-client";
import { hapticSelection } from "../lib/haptics";
import { useThemeColors } from "../lib/theme";
import { getDomainName } from "../lib/utils";
import { BookmarkItemPending } from "./bookmark-item-pending";
import { BookmarkItemTweet } from "./bookmark-item-tweet";
import { BookmarkItemYoutube } from "./bookmark-item-youtube";

interface BookmarkItemProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

export function CardActionButton({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full border border-border bg-background active:opacity-70"
    >
      <Ionicons name={icon} size={15} color={color ?? colors.mutedForeground} />
    </Pressable>
  );
}

export function BookmarkItem({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemProps) {
  if (bookmark.status === "PENDING" || bookmark.status === "PROCESSING") {
    return (
      <BookmarkItemPending
        bookmark={bookmark}
        onPress={onPress}
        onToggleStar={onToggleStar}
        onToggleRead={onToggleRead}
      />
    );
  }

  if (bookmark.type === "YOUTUBE" && bookmark.metadata?.youtubeId) {
    return (
      <BookmarkItemYoutube
        bookmark={bookmark}
        onToggleStar={onToggleStar}
        onToggleRead={onToggleRead}
      />
    );
  }

  if (bookmark.type === "TWEET") {
    return (
      <BookmarkItemTweet
        bookmark={bookmark}
        onPress={onPress}
        onToggleStar={onToggleStar}
      />
    );
  }

  return (
    <BookmarkItemPage
      bookmark={bookmark}
      onPress={onPress}
      onToggleStar={onToggleStar}
      onToggleRead={onToggleRead}
    />
  );
}

function BookmarkItemPage({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemProps) {
  const colors = useThemeColors();
  const domainName = getDomainName(bookmark.url);

  const preview =
    bookmark.preview ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";

  const faviconUrl =
    bookmark.faviconUrl ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder-favicon.png";

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-border bg-card active:opacity-90"
    >
      <View className="relative">
        <Image
          source={{ uri: preview }}
          style={{ height: 180, width: "100%" }}
          resizeMode="cover"
        />
        <View className="absolute right-2 top-2 flex-row gap-1.5">
          <CardActionButton
            icon={bookmark.starred ? "star" : "star-outline"}
            color={bookmark.starred ? "#F59E0B" : undefined}
            onPress={onToggleStar}
          />
          {(bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") && (
            <CardActionButton
              icon={bookmark.read ? "checkmark-circle" : "ellipse-outline"}
              color={bookmark.read ? "#10B981" : undefined}
              onPress={onToggleRead}
            />
          )}
        </View>
      </View>

      <View className="flex-row items-start gap-3 px-4 py-3.5">
        <Image
          source={{ uri: faviconUrl }}
          style={{ width: 24, height: 24, borderRadius: 6, marginTop: 2 }}
        />
        <View className="flex-1 gap-0.5">
          <Text
            numberOfLines={1}
            className="font-sans text-[13px] text-muted-foreground"
          >
            {domainName}
          </Text>
          <Text
            numberOfLines={2}
            className="font-sans-semibold text-[15px] text-foreground"
          >
            {bookmark.title}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
          style={{ marginTop: 6 }}
        />
      </View>
    </Pressable>
  );
}
