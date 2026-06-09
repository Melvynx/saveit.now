import {
  Check,
  Circle,
  Copy,
  ExternalLink,
  Star,
  Tag,
  Trash2,
  X,
} from "@tamagui/lucide-icons";
import { useQuery, useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, ScrollView } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Button, Card, H3, H4, Image, Text, XStack, YStack } from "tamagui";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export default function BookmarkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text>Loading...</Text>
      </YStack>
    );
  }

  if (!bookmark) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
        <Text color="$red10">Failed to load bookmark</Text>
        <Button onPress={() => router.back()} theme="blue">
          Go Back
        </Button>
      </YStack>
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

  const domainName = (() => {
    try {
      return new URL(bookmarkView.url).hostname;
    } catch {
      return bookmarkView.url;
    }
  })();

  return (
    <YStack flex={1}>
      {/* Header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        padding="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        backgroundColor="$background"
      >
        <H3 flex={1} numberOfLines={1} fontSize="$5">
          {bookmarkView.title || domainName}
        </H3>
        <Button
          size="$3"
          circular
          variant="outlined"
          onPress={() => router.back()}
        >
          <X size={20} />
        </Button>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <YStack padding="$4" gap="$4">
          <BookmarkDetailContent
            bookmark={bookmarkView as any}
            preview={preview}
            faviconUrl={faviconUrl}
          />

          {/* Summary */}
          {bookmarkView.summary && (
            <Card padding="$4" gap="$3">
              <H4>Summary</H4>
              <Text color="$gray11" lineHeight="$1">
                {bookmarkView.summary}
              </Text>
            </Card>
          )}

          {/* Tags */}
          {bookmarkView.tags && bookmarkView.tags.length > 0 && (
            <Card padding="$4" gap="$3">
              <H4>Tags</H4>
              <XStack flexWrap="wrap" gap="$2">
                {bookmarkView.tags.map((tagWrapper: any) => (
                  <Button
                    key={tagWrapper.tag.id}
                    size="$2"
                    icon={<Tag size={14} />}
                    backgroundColor="$blue4"
                    color="$blue12"
                    fontSize="$2"
                    borderRadius="$3"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                  >
                    {tagWrapper.tag.name}
                  </Button>
                ))}
              </XStack>
            </Card>
          )}
        </YStack>
      </ScrollView>

      {/* Floating Action Toolbar */}
      <XStack
        position="absolute"
        bottom="$4"
        alignSelf="center"
        backgroundColor="$background"
        borderRadius="$8"
        padding="$3"
        gap="$3"
        justifyContent="center"
        alignItems="center"
        borderWidth={1}
        borderColor="$borderColor"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.1}
        shadowRadius={8}
        elevation={8}
      >
        <Button
          circular
          size="$3"
          backgroundColor="transparent"
          onPress={handleToggleStar}
          theme={bookmarkView.starred ? "yellow" : undefined}
        >
          <Star
            size={20}
            color={bookmarkView.starred ? "$yellow10" : "$gray10"}
            fill={bookmarkView.starred ? "$yellow10" : "transparent"}
          />
        </Button>

        {(bookmarkView.type === "ARTICLE" || bookmarkView.type === "YOUTUBE") && (
          <Button
            circular
            size="$3"
            backgroundColor="transparent"
            onPress={handleToggleRead}
            theme={bookmarkView.read ? "green" : undefined}
          >
            {bookmarkView.read ? (
              <Check size={20} color="$green10" />
            ) : (
              <Circle size={20} color="$gray10" />
            )}
          </Button>
        )}

        <Button
          circular
          size="$3"
          backgroundColor="transparent"
          onPress={handleCopyLink}
          disabled={copying}
        >
          <Copy size={20} color="$gray10" />
        </Button>

        <Button
          circular
          size="$3"
          backgroundColor="transparent"
          onPress={handleOpenLink}
          theme="blue"
        >
          <ExternalLink size={20} />
        </Button>

        <Button
          circular
          size="$3"
          backgroundColor="transparent"
          onPress={handleDeleteBookmark}
          theme="red"
        >
          <Trash2 size={20} color="$red10" />
        </Button>
      </XStack>
    </YStack>
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
    <>
      <Card padding="$4" gap="$4">
        <XStack gap="$3" alignItems="center">
          <Image
            source={{
              uri:
                user?.profile_image_url_https ||
                faviconUrl ||
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
            }}
            width={56}
            height={56}
            borderRadius={28}
          />
          <YStack flex={1}>
            <Text fontWeight="700" fontSize="$5">
              {user?.name || bookmark.title || "Twitter User"}
            </Text>
            <Text color="$gray10" fontSize="$4">
              @{user?.screen_name || "user"}
            </Text>
          </YStack>
          <YStack
            width={28}
            height={28}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="$6" fontWeight="900">
              𝕏
            </Text>
          </YStack>
        </XStack>

        {tweetText && (
          <Text
            fontSize="$3"
            lineHeight="$4"
            color="$gray11"
            numberOfLines={8}
            letterSpacing={-0.2}
          >
            {tweetText}
          </Text>
        )}

        {media && (
          <Image
            source={{ uri: media.media_url_https }}
            width="100%"
            height={250}
            borderRadius="$4"
            resizeMode="cover"
          />
        )}

        <Text color="$gray9" fontSize="$3">
          {new Date(bookmark.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </Card>

      <Card padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2">
          <Image
            source={{ uri: faviconUrl }}
            width={24}
            height={24}
            borderRadius="$3"
          />
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600">
              {user?.name || bookmark.title}
            </Text>
            <Text color="$gray10" fontSize="$3" numberOfLines={1}>
              {bookmark.url}
            </Text>
          </YStack>
        </XStack>
      </Card>
    </>
  );
}

function YoutubeDetailContent({ bookmark }: { bookmark: any }) {
  const youtubeId = bookmark.metadata?.youtubeId;

  if (!youtubeId) return null;

  return (
    <>
      <Card padding="$0" overflow="hidden" borderRadius="$4">
        <YoutubePlayer
          height={220}
          videoId={youtubeId}
          webViewProps={{
            scrollEnabled: false,
            showsVerticalScrollIndicator: false,
            showsHorizontalScrollIndicator: false,
          }}
        />
      </Card>

      <Card padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2">
          <Image
            source={{ uri: "https://www.youtube.com/favicon.ico" }}
            width={24}
            height={24}
            borderRadius="$3"
          />
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" numberOfLines={2}>
              {bookmark.title || "YouTube Video"}
            </Text>
            <Text color="$gray10" fontSize="$3">
              youtube.com
            </Text>
          </YStack>
        </XStack>
      </Card>
    </>
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
  const domainName = (() => {
    try {
      return new URL(bookmark.url).hostname;
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <>
      {preview && (
        <Card padding="$0" overflow="hidden">
          <Image source={{ uri: preview }} height={200} width="100%" />
        </Card>
      )}

      <Card padding="$4" gap="$3">
        <XStack alignItems="flex-start" gap="$2">
          <Image
            source={{ uri: faviconUrl }}
            width={24}
            height={24}
            borderRadius="$3"
          />
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="600" numberOfLines={2}>
              {bookmark.title || "Untitled"}
            </Text>
            <Text color="$gray10" fontSize="$3" numberOfLines={1}>
              {domainName}
            </Text>
          </YStack>
        </XStack>
      </Card>
    </>
  );
}
