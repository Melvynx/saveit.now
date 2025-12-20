import { Check, Circle, Star } from "@tamagui/lucide-icons";
import { useWindowDimensions } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Button, Card, XStack, YStack } from "tamagui";
import { type Bookmark } from "../lib/api-client";

interface BookmarkItemYoutubeProps {
  bookmark: Bookmark;
  onPress?: () => void;
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
  const playerWidth = width - 32;
  const playerHeight = Math.round(playerWidth * (9 / 16));

  if (!youtubeId) {
    return null;
  }

  return (
    <Card
      elevate
      size="$4"
      bordered
      marginBottom="$3"
      overflow="hidden"
      padding="$0"
    >
      <YStack overflow="hidden" borderRadius="$4">
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
      </YStack>
      <XStack position="absolute" top="$2" right="$2" gap="$1" opacity={0.9}>
        <Button
          size="$2"
          circular
          backgroundColor="$background"
          borderColor="$borderColor"
          onPress={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
        >
          <Star
            size={14}
            color={bookmark.starred ? "$yellow10" : "$gray10"}
            fill={bookmark.starred ? "$yellow10" : "transparent"}
          />
        </Button>

        <Button
          size="$2"
          circular
          backgroundColor="$background"
          borderColor="$borderColor"
          onPress={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
        >
          {bookmark.read ? (
            <Check size={14} color="$green10" />
          ) : (
            <Circle size={14} color="$gray10" />
          )}
        </Button>
      </XStack>
    </Card>
  );
}
