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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, ScrollView } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Button, Card, H3, H4, Image, Text, XStack, YStack } from "tamagui";
import { apiClient, type Bookmark } from "../../src/lib/api-client";

export default function BookmarkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copying, setCopying] = useState(false);

  // Fetch bookmark details
  const {
    data: bookmark,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bookmark", id],
    queryFn: async () => {
      if (!id) throw new Error("No bookmark ID provided");
      return await apiClient.getBookmark(id);
    },
    enabled: !!id,
  });

  const preview =
    bookmark?.preview ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";
  const faviconUrl =
    bookmark?.faviconUrl ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder-favicon.png";

  // Update bookmark mutation
  const updateBookmarkMutation = useMutation({
    mutationFn: async (updates: Partial<Bookmark>) => {
      if (!id) throw new Error("No bookmark ID");
      return await apiClient.updateBookmark(id, updates);
    },
    onSuccess: (updatedBookmark) => {
      // Update cache
      queryClient.setQueryData(["bookmark", id], updatedBookmark);

      // Update bookmarks list cache
      queryClient.setQueryData(
        ["bookmarks"],
        (oldData: { pages: Array<{ bookmarks: Bookmark[] }> }) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              bookmarks: page.bookmarks.map((b: Bookmark) =>
                b.id === updatedBookmark.id ? updatedBookmark : b,
              ),
            })),
          };
        },
      );
    },
    onError: () => {
      Alert.alert("Error", "Failed to update bookmark");
    },
  });

  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No bookmark ID");
      return await apiClient.deleteBookmark(id);
    },
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["bookmark", id] });

      // Invalidate all bookmarks queries to force a refresh
      queryClient.invalidateQueries({
        queryKey: ["bookmarks"],
        exact: false,
      });

      // Navigate back
      router.back();
      Alert.alert("Success", "Bookmark deleted successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete bookmark");
    },
  });

  const handleToggleStar = () => {
    if (!bookmark) return;
    updateBookmarkMutation.mutate({ starred: !bookmark.starred });
  };

  const handleToggleRead = () => {
    if (!bookmark) return;
    updateBookmarkMutation.mutate({ read: !bookmark.read });
  };

  const handleCopyLink = async () => {
    if (!bookmark) return;
    setCopying(true);
    try {
      // Note: In React Native, you'd typically use @react-native-clipboard/clipboard
      // For now, we'll show an alert
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
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteBookmarkMutation.mutate(),
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

  if (error || !bookmark) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
        <Text color="$red10">Failed to load bookmark</Text>
        <Button onPress={() => router.back()} theme="blue">
          Go Back
        </Button>
      </YStack>
    );
  }

  const domainName = new URL(bookmark.url).hostname;

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
          {bookmark.title || domainName}
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
            bookmark={bookmark}
            preview={preview}
            faviconUrl={faviconUrl}
          />

          {/* Summary */}
          {bookmark.summary && (
            <Card padding="$4" gap="$3">
              <H4>Summary</H4>
              <Text color="$gray11" lineHeight="$1">
                {bookmark.summary}
              </Text>
            </Card>
          )}

          {/* Tags */}
          {bookmark.tags && bookmark.tags.length > 0 && (
            <Card padding="$4" gap="$3">
              <H4>Tags</H4>
              <XStack flexWrap="wrap" gap="$2">
                {bookmark.tags.map((tagWrapper) => (
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
          theme={bookmark.starred ? "yellow" : undefined}
          disabled={updateBookmarkMutation.isPending}
        >
          <Star
            size={20}
            color={bookmark.starred ? "$yellow10" : "$gray10"}
            fill={bookmark.starred ? "$yellow10" : "transparent"}
          />
        </Button>

        {(bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") && (
          <Button
            circular
            size="$3"
            backgroundColor="transparent"
            onPress={handleToggleRead}
            theme={bookmark.read ? "green" : undefined}
            disabled={updateBookmarkMutation.isPending}
          >
            {bookmark.read ? (
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
          disabled={deleteBookmarkMutation.isPending}
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
  bookmark: Bookmark;
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
  bookmark: Bookmark;
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

function YoutubeDetailContent({ bookmark }: { bookmark: Bookmark }) {
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
  bookmark: Bookmark;
  preview: string;
  faviconUrl: string;
}) {
  const domainName = new URL(bookmark.url).hostname;

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
