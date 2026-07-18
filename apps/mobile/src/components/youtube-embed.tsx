import { type ComponentType } from "react";
import { Image, useWindowDimensions } from "react-native";

type YouTubePlayerProps = {
  height: number;
  videoId: string;
  webViewProps?: Record<string, unknown>;
};

type YouTubeEmbedProps = {
  videoId: string;
  posterUrl?: string | null;
  /** Use a fixed height in constrained detail surfaces. */
  height?: number;
  /** Width used for the default responsive 16:9 height. */
  availableWidth?: number;
};

let resolvedYouTubePlayer: ComponentType<YouTubePlayerProps> | null | undefined;

function getYouTubePlayer(): ComponentType<YouTubePlayerProps> | null {
  if (resolvedYouTubePlayer !== undefined) {
    return resolvedYouTubePlayer;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const youtubeIframe = require("react-native-youtube-iframe") as {
      default?: ComponentType<YouTubePlayerProps>;
    };
    resolvedYouTubePlayer = youtubeIframe.default ?? null;
  } catch {
    resolvedYouTubePlayer = null;
  }

  return resolvedYouTubePlayer;
}

export function YouTubeEmbed({
  videoId,
  posterUrl,
  height,
  availableWidth,
}: YouTubeEmbedProps) {
  const { width: windowWidth } = useWindowDimensions();
  const embedHeight =
    height ?? Math.round(Math.max(0, availableWidth ?? windowWidth) * (9 / 16));
  const YouTubePlayer = getYouTubePlayer();

  if (!YouTubePlayer) {
    return (
      <Image
        source={{
          uri: posterUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        }}
        style={{ height: embedHeight, width: "100%" }}
        resizeMode="cover"
      />
    );
  }

  return (
    <YouTubePlayer
      height={embedHeight}
      videoId={videoId}
      webViewProps={{
        scrollEnabled: false,
        showsVerticalScrollIndicator: false,
        showsHorizontalScrollIndicator: false,
        overScrollMode: "never",
        bounces: false,
        style: { overflow: "hidden" },
      }}
    />
  );
}
