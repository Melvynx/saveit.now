import { Check, Circle, Star } from "@tamagui/lucide-icons";
import { Button, Card, Image, Spinner, Text, XStack, YStack } from "tamagui";
import { type Bookmark } from "../lib/api-client";

interface BookmarkItemProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

export function BookmarkItem({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemProps) {
  const domainName = new URL(bookmark.url).hostname;

  const preview =
    bookmark.preview ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";

  const faviconUrl =
    bookmark.faviconUrl ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder-favicon.png";

  return (
    <Card
      elevate
      size="$4"
      bordered
      marginBottom="$3"
      pressStyle={{ scale: 0.98 }}
      onPress={onPress}
      overflow="hidden"
    >
      {/* Header with preview/thumbnail */}
      {preview && (
        <Card.Header padding="$0" position="relative">
          <Image
            source={{ uri: preview }}
            height={180}
            width="100%"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            resizeMode="cover"
          />
          {/* Loading overlay for pending status */}
          {bookmark.status === "PENDING" && (
            <XStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
              alignItems="center"
              justifyContent="center"
            >
              <Spinner size="large" color="$white" />
            </XStack>
          )}
          {/* Actions overlay */}
          <XStack
            position="absolute"
            top="$2"
            right="$2"
            space="$1"
            opacity={0.9}
          >
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

            {(bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") && (
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
            )}
          </XStack>
        </Card.Header>
      )}

      {/* Content */}
      <Card.Footer padding="$4">
        <XStack alignItems="flex-start" space="$2">
          {/* Favicon placeholder */}
          <Image
            source={{ uri: faviconUrl }}
            width={24}
            height={24}
            borderRadius="$2"
            alt={`${domainName} favicon`}
            flexShrink={0}
          />

          {/* Content */}
          <YStack gap="$1">
            {/* Title */}
            <Text numberOfLines={1}>{domainName}</Text>

            {/* URL */}
            <Text color="$gray10" fontSize="$2" numberOfLines={1}>
              {bookmark.title}
            </Text>
          </YStack>
        </XStack>
      </Card.Footer>
    </Card>
  );
}
