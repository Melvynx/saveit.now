import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { Image, StyleSheet, Text as RNText, View } from "react-native";

import { useThemeColors } from "../lib/theme";
import { YouTubeEmbed } from "./youtube-embed";

type BookmarkDetailContentProps = {
  bookmark: BookmarkDetailDTO;
  preview: string;
  faviconUrl: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getYouTubeId(bookmark: BookmarkDetailDTO): string | null {
  return asString(bookmark.metadata?.youtubeId);
}

export function BookmarkDetailContent({
  bookmark,
  preview,
  faviconUrl,
}: BookmarkDetailContentProps) {
  if (bookmark.type === "TWEET") {
    return <TweetDetailContent bookmark={bookmark} faviconUrl={faviconUrl} />;
  }

  const youtubeId = getYouTubeId(bookmark);
  if (bookmark.type === "YOUTUBE" && youtubeId) {
    return (
      <YouTubeDetailContent videoId={youtubeId} posterUrl={bookmark.preview} />
    );
  }

  return <DefaultDetailContent preview={preview} />;
}

function TweetDetailContent({
  bookmark,
  faviconUrl,
}: {
  bookmark: BookmarkDetailDTO;
  faviconUrl: string;
}) {
  const metadata = bookmark.metadata;
  const user = asRecord(metadata?.user);
  const mediaDetails = Array.isArray(metadata?.mediaDetails)
    ? metadata.mediaDetails
    : [];
  const media = asRecord(mediaDetails[0]);
  const tweetText = asString(metadata?.text) ?? bookmark.summary;
  const profileImageUrl = asString(user?.profile_image_url_https) ?? faviconUrl;
  const mediaUrl = asString(media?.media_url_https);

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-5">
      <View className="flex-row items-center gap-3">
        <Image
          source={{ uri: profileImageUrl }}
          style={{ width: 52, height: 52, borderRadius: 26 }}
        />
        <View className="flex-1">
          <RNText className="font-sans-bold text-[16px] text-foreground">
            {asString(user?.name) ?? bookmark.title ?? "Twitter User"}
          </RNText>
          <RNText className="font-sans text-[13px] text-muted-foreground">
            @{asString(user?.screen_name) ?? "user"}
          </RNText>
        </View>
        <RNText className="font-sans-bold text-[20px] text-foreground">
          𝕏
        </RNText>
      </View>

      {tweetText ? (
        <RNText className="font-sans text-[15px] leading-[22px] text-foreground">
          {tweetText}
        </RNText>
      ) : null}

      {mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
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

function YouTubeDetailContent({
  videoId,
  posterUrl,
}: {
  videoId: string;
  posterUrl: string | null;
}) {
  const colors = useThemeColors();
  const outlineColor = colors.isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.1)";

  return (
    <View
      className="overflow-hidden rounded-2xl bg-card"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: outlineColor,
      }}
    >
      <YouTubeEmbed videoId={videoId} posterUrl={posterUrl} height={220} />
    </View>
  );
}

function DefaultDetailContent({ preview }: { preview: string }) {
  const colors = useThemeColors();

  return (
    <View className="overflow-hidden rounded-2xl bg-card">
      <Image
        source={{ uri: preview }}
        style={{
          height: 200,
          width: "100%",
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
        }}
        resizeMode="cover"
      />
    </View>
  );
}
