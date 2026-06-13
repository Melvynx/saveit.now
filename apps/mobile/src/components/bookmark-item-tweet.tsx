import { Image, Pressable, Text, View } from "react-native";

import { type Bookmark } from "../lib/api-client";
import { CardActionButton } from "./bookmark-item";

interface BookmarkItemTweetProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
}

export function BookmarkItemTweet({
  bookmark,
  onPress,
  onToggleStar,
}: BookmarkItemTweetProps) {
  const metadata = bookmark.metadata;
  const user = metadata?.user;
  const tweetText = metadata?.text || bookmark.summary || bookmark.title;
  const media = metadata?.mediaDetails?.[0];

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-border bg-card p-4 active:opacity-90"
    >
      <View className="absolute right-2 top-2 z-10">
        <CardActionButton
          icon={bookmark.starred ? "star" : "star-outline"}
          color={bookmark.starred ? "#F59E0B" : undefined}
          onPress={onToggleStar}
        />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-3 pr-10">
          <Image
            source={{
              uri:
                user?.profile_image_url_https ||
                bookmark.faviconUrl ||
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
            }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="font-sans-bold text-[15px] text-foreground"
            >
              {user?.name || bookmark.title || "Twitter User"}
            </Text>
            <Text className="font-sans text-[13px] text-muted-foreground">
              @{user?.screen_name || "user"}
            </Text>
          </View>
          <Text className="text-[17px] font-sans-bold text-foreground">𝕏</Text>
        </View>

        {tweetText ? (
          <Text
            numberOfLines={6}
            className="font-sans text-[15px] leading-[22px] text-foreground"
          >
            {tweetText}
          </Text>
        ) : null}

        {media ? (
          <Image
            source={{ uri: media.media_url_https }}
            style={{ width: "100%", height: 200, borderRadius: 12 }}
            resizeMode="cover"
          />
        ) : null}

        <View className="flex-row items-center gap-2">
          <Text className="font-sans text-[12px] text-muted-foreground">
            {new Date(bookmark.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text className="font-sans text-[12px] text-muted-foreground">•</Text>
          <Text className="font-sans-semibold text-[12px] text-foreground">
            View on X
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
