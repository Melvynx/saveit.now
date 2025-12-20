import { Star } from "@tamagui/lucide-icons";
import { Button, Card, Image, Text, XStack, YStack } from "tamagui";
import { type Bookmark } from "../lib/api-client";

interface BookmarkItemTweetProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead?: () => void;
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
    <Card
      elevate
      size="$4"
      bordered
      marginBottom="$3"
      pressStyle={{ scale: 0.98 }}
      onPress={onPress}
      overflow="hidden"
      padding="$4"
    >
      <XStack position="absolute" top="$2" right="$2" zIndex={10}>
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
      </XStack>

      <YStack gap="$3">
        <XStack gap="$3" alignItems="center">
          <Image
            source={{
              uri:
                user?.profile_image_url_https ||
                bookmark.faviconUrl ||
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
            }}
            width={48}
            height={48}
            borderRadius={24}
          />
          <YStack flex={1}>
            <Text fontWeight="700" fontSize="$4" numberOfLines={1}>
              {user?.name || bookmark.title || "Twitter User"}
            </Text>
            <Text color="$gray10" fontSize="$3">
              @{user?.screen_name || "user"}
            </Text>
          </YStack>
          <XLogo />
        </XStack>

        {tweetText && (
          <Text fontSize="$4" lineHeight="$5" numberOfLines={6}>
            {tweetText}
          </Text>
        )}

        {media && (
          <Image
            source={{ uri: media.media_url_https }}
            width="100%"
            height={200}
            borderRadius="$3"
            resizeMode="cover"
          />
        )}

        <XStack alignItems="center" gap="$2">
          <Text color="$gray9" fontSize="$2">
            {new Date(bookmark.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
          <Text color="$gray9" fontSize="$2">
            •
          </Text>
          <Text color="$blue10" fontSize="$2">
            View on X
          </Text>
        </XStack>
      </YStack>
    </Card>
  );
}

function XLogo() {
  return (
    <YStack width={24} height={24} alignItems="center" justifyContent="center">
      <Text fontSize="$5" fontWeight="900">
        𝕏
      </Text>
    </YStack>
  );
}
