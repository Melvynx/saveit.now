import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ComponentType, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Text as RNText,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../src/components/ui/button";
import { IconButton } from "../../src/components/ui/icon-button";
import { LoadingScreen } from "../../src/components/ui/loading";
import { StatusScreen } from "../../src/components/ui/status-screen";
import { Text } from "../../src/components/ui/text";
import { hapticWarning } from "../../src/lib/haptics";
import { useThemeColors } from "../../src/lib/theme";
import { getDomainName } from "../../src/lib/utils";

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

export default function BookmarkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [copying, setCopying] = useState(false);

  // Reactive query — updates automatically during processing.
  const bookmark = useQuery(
    api.bookmarks.queries.get,
    id ? { id: id as Id<"bookmarks"> } : "skip",
  );
  const isLoading = bookmark === undefined;

  const updateBookmarkMutation = useMutation(api.bookmarks.mutations.update);
  const deleteBookmarkMutation = useMutation(api.bookmarks.mutations.remove);

  const preview =
    bookmark?.preview ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";
  const faviconUrl =
    bookmark?.faviconUrl ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder-favicon.png";

  const handleToggleStar = async () => {
    if (!bookmark) return;
    try {
      await updateBookmarkMutation({
        id: bookmark._id,
        patch: { starred: !bookmark.starred },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  const handleToggleRead = async () => {
    if (!bookmark) return;
    try {
      await updateBookmarkMutation({
        id: bookmark._id,
        patch: { read: !bookmark.read },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  const handleCopyLink = async () => {
    if (!bookmark) return;
    setCopying(true);
    try {
      Alert.alert("Link Copied", bookmark.url);
    } finally {
      setCopying(false);
    }
  };

  const handleOpenLink = async () => {
    if (!bookmark) return;
    try {
      const supported = await Linking.canOpenURL(bookmark.url);
      if (supported) {
        await Linking.openURL(bookmark.url);
      } else {
        Alert.alert("Error", "Cannot open this URL");
      }
    } catch {
      Alert.alert("Error", "Failed to open link");
    }
  };

  const handleDeleteBookmark = () => {
    if (!bookmark) return;

    hapticWarning();
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to delete this bookmark? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBookmarkMutation({ id: bookmark._id });
              router.back();
              Alert.alert("Success", "Bookmark deleted successfully");
            } catch {
              Alert.alert("Error", "Failed to delete bookmark");
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!bookmark) {
    return (
      <StatusScreen
        icon="alert-circle-outline"
        title="Something went wrong"
        message="Failed to load bookmark"
        footer={
          <Button onPress={() => router.back()} className="self-stretch">
            Go Back
          </Button>
        }
      />
    );
  }

  // Adapt Convex bookmark to the shape expected by sub-components.
  const bookmarkView = {
    ...bookmark,
    id: bookmark._id as string,
    createdAt:
      typeof bookmark.createdAt === "number"
        ? new Date(bookmark.createdAt).toISOString()
        : bookmark.createdAt,
  };

  const domainName = getDomainName(bookmarkView.url);

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-4">
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="font-sans-semibold text-[17px] text-foreground"
          >
            {bookmarkView.title || domainName}
          </Text>
          <Text className="font-sans text-[12px] text-muted-foreground">
            {domainName}
          </Text>
        </View>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View className="gap-4 px-4 pt-2">
          <BookmarkDetailContent
            bookmark={bookmarkView as any}
            preview={preview}
            faviconUrl={faviconUrl}
          />

          {/* Summary */}
          {bookmarkView.summary && (
            <View className="gap-2">
              <Text variant="section-label">Summary</Text>
              <View className="rounded-2xl bg-secondary px-5 py-4">
                <Text className="font-sans text-[14px] leading-[21px] text-foreground">
                  {bookmarkView.summary}
                </Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {bookmarkView.tags && bookmarkView.tags.length > 0 && (
            <View className="gap-2">
              <Text variant="section-label">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {bookmarkView.tags.map((tagWrapper: any) => (
                  <View
                    key={tagWrapper.tag.id}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5"
                  >
                    <RNText className="font-sans-semibold text-[13px] text-foreground">
                      #{tagWrapper.tag.name}
                    </RNText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Toolbar */}
      <View
        className="absolute self-center rounded-full bg-card"
        style={{
          bottom: insets.bottom + 16,
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: "#000000",
          shadowOpacity: colors.isDark ? 0.5 : 0.1,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        <IconButton
          size="xl"
          icon={bookmarkView.starred ? "star" : "star-outline"}
          color={bookmarkView.starred ? "#F59E0B" : undefined}
          onPress={handleToggleStar}
        />
        {(bookmarkView.type === "ARTICLE" || bookmarkView.type === "YOUTUBE") && (
          <IconButton
            size="xl"
            icon={bookmarkView.read ? "checkmark-circle" : "ellipse-outline"}
            color={bookmarkView.read ? "#10B981" : undefined}
            onPress={handleToggleRead}
          />
        )}
        <IconButton
          size="xl"
          icon="copy-outline"
          onPress={handleCopyLink}
          disabled={copying}
        />
        <IconButton size="xl" icon="open-outline" onPress={handleOpenLink} />
        <IconButton
          size="xl"
          icon="trash-outline"
          color={colors.destructive}
          onPress={handleDeleteBookmark}
        />
      </View>
    </View>
  );
}

function BookmarkDetailContent({
  bookmark,
  preview,
  faviconUrl,
}: {
  bookmark: any;
  preview: string;
  faviconUrl: string;
}) {
  if (bookmark.type === "TWEET") {
    return <TweetDetailContent bookmark={bookmark} faviconUrl={faviconUrl} />;
  }

  if (bookmark.type === "YOUTUBE" && bookmark.metadata?.youtubeId) {
    return <YoutubeDetailContent bookmark={bookmark} />;
  }

  return (
    <DefaultDetailContent
      bookmark={bookmark}
      preview={preview}
      faviconUrl={faviconUrl}
    />
  );
}

function TweetDetailContent({
  bookmark,
  faviconUrl,
}: {
  bookmark: any;
  faviconUrl: string;
}) {
  const metadata = bookmark.metadata;
  const user = metadata?.user;
  const tweetText = metadata?.text || bookmark.summary;
  const media = metadata?.mediaDetails?.[0];

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-5">
      <View className="flex-row items-center gap-3">
        <Image
          source={{
            uri:
              user?.profile_image_url_https ||
              faviconUrl ||
              "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
          }}
          style={{ width: 52, height: 52, borderRadius: 26 }}
        />
        <View className="flex-1">
          <RNText className="font-sans-bold text-[16px] text-foreground">
            {user?.name || bookmark.title || "Twitter User"}
          </RNText>
          <RNText className="font-sans text-[13px] text-muted-foreground">
            @{user?.screen_name || "user"}
          </RNText>
        </View>
        <RNText className="font-sans-bold text-[20px] text-foreground">𝕏</RNText>
      </View>

      {tweetText ? (
        <RNText className="font-sans text-[15px] leading-[22px] text-foreground">
          {tweetText}
        </RNText>
      ) : null}

      {media ? (
        <Image
          source={{ uri: media.media_url_https }}
          style={{ width: "100%", height: 250, borderRadius: 16 }}
          resizeMode="cover"
        />
      ) : null}

      <RNText className="font-sans text-[13px] text-muted-foreground">
        {new Date(bookmark.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </RNText>
    </View>
  );
}

function YoutubeDetailContent({ bookmark }: { bookmark: any }) {
  const youtubeId = bookmark.metadata?.youtubeId;
  const YoutubePlayer = getYoutubePlayer();

  if (!youtubeId) return null;

  if (!YoutubePlayer) {
    return (
      <View className="gap-4">
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Image
            source={{
              uri:
                bookmark.preview ||
                `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
            }}
            style={{ height: 220, width: "100%" }}
            resizeMode="cover"
          />
        </View>

        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
          <Image
            source={{ uri: "https://www.youtube.com/favicon.ico" }}
            style={{ width: 24, height: 24, borderRadius: 6 }}
          />
          <View className="flex-1">
            <RNText
              numberOfLines={2}
              className="font-sans-semibold text-[15px] text-foreground"
            >
              {bookmark.title || "YouTube Video"}
            </RNText>
            <RNText className="font-sans text-[13px] text-muted-foreground">
              youtube.com
            </RNText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <YoutubePlayer
          height={220}
          videoId={youtubeId}
          webViewProps={{
            scrollEnabled: false,
            showsVerticalScrollIndicator: false,
            showsHorizontalScrollIndicator: false,
          }}
        />
      </View>

      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
        <Image
          source={{ uri: "https://www.youtube.com/favicon.ico" }}
          style={{ width: 24, height: 24, borderRadius: 6 }}
        />
        <View className="flex-1">
          <RNText
            numberOfLines={2}
            className="font-sans-semibold text-[15px] text-foreground"
          >
            {bookmark.title || "YouTube Video"}
          </RNText>
          <RNText className="font-sans text-[13px] text-muted-foreground">
            youtube.com
          </RNText>
        </View>
      </View>
    </View>
  );
}

function DefaultDetailContent({
  bookmark,
  preview,
  faviconUrl,
}: {
  bookmark: any;
  preview: string;
  faviconUrl: string;
}) {
  const domainName = getDomainName(bookmark.url);

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <Image
        source={{ uri: preview }}
        style={{ height: 200, width: "100%" }}
        resizeMode="cover"
      />
      <View className="flex-row items-start gap-3 px-4 py-3.5">
        <Image
          source={{ uri: faviconUrl }}
          style={{ width: 24, height: 24, borderRadius: 6, marginTop: 2 }}
        />
        <View className="flex-1">
          <RNText
            numberOfLines={2}
            className="font-sans-semibold text-[15px] text-foreground"
          >
            {bookmark.title || "Untitled"}
          </RNText>
          <RNText
            numberOfLines={1}
            className="font-sans text-[13px] text-muted-foreground"
          >
            {domainName}
          </RNText>
        </View>
      </View>
    </View>
  );
}
