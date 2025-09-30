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
          {/* Preview Image */}
          {preview && (
            <Card padding="$0" overflow="hidden">
              <Image source={{ uri: preview }} height={200} width="100%" />
            </Card>
          )}

          {/* URL and Basic Info */}
          <Card padding="$4" gap="$3">
            <XStack alignItems="flex-start" gap="$2">
              {/* Favicon placeholder */}
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
                  {bookmark.url}
                </Text>
              </YStack>
            </XStack>
          </Card>

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
