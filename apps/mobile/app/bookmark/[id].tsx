import {
  Check,
  Circle,
  Copy,
  ExternalLink,
  Star,
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
      queryClient.setQueryData(["bookmarks"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            bookmarks: page.bookmarks.map((b: Bookmark) =>
              b.id === updatedBookmark.id ? updatedBookmark : b,
            ),
          })),
        };
      });
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
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
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
    } catch (error) {
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
        <H3 flex={1} numberOfLines={1}>
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

      <ScrollView style={{ flex: 1 }}>
        <YStack padding="$4" gap="$4">
          {/* Preview Image */}
          {bookmark.preview && (
            <Card padding="$0" overflow="hidden">
              <Image
                source={{ uri: bookmark.preview }}
                height={200}
                width="100%"
                resizeMode="cover"
              />
            </Card>
          )}

          {/* URL and Basic Info */}
          <Card padding="$4" gap="$3">
            <XStack alignItems="center" gap="$2">
              {/* Favicon placeholder */}
              <YStack
                width={32}
                height={32}
                backgroundColor="$gray3"
                borderRadius="$3"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$3" fontWeight="600">
                  {domainName.charAt(0).toUpperCase()}
                </Text>
              </YStack>
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
                  <YStack
                    key={tagWrapper.tag.id}
                    backgroundColor="$blue4"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$3"
                  >
                    <Text fontSize="$2" color="$blue11">
                      {tagWrapper.tag.name}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </Card>
          )}

          {/* Metadata */}
          <Card padding="$4" gap="$3">
            <H4>Details</H4>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$gray10">Created:</Text>
                <Text>{new Date(bookmark.createdAt).toLocaleDateString()}</Text>
              </XStack>
              {bookmark.type && (
                <XStack justifyContent="space-between">
                  <Text color="$gray10">Type:</Text>
                  <Text>{bookmark.type}</Text>
                </XStack>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Action Buttons */}
      <YStack
        padding="$4"
        gap="$3"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        {/* Action Row 1 */}
        <XStack gap="$2" justifyContent="space-between">
          <Button
            flex={1}
            variant="outlined"
            onPress={handleToggleStar}
            theme={bookmark.starred ? "yellow" : undefined}
            disabled={updateBookmarkMutation.isPending}
          >
            <Star
              size={16}
              color={bookmark.starred ? "yellow" : "gray"}
              fill={bookmark.starred ? "$yellow10" : "transparent"}
            />
            <Text>{bookmark.starred ? "Starred" : "Star"}</Text>
          </Button>

          {(bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") && (
            <Button
              flex={1}
              variant="outlined"
              onPress={handleToggleRead}
              theme={bookmark.read ? "green" : undefined}
              disabled={updateBookmarkMutation.isPending}
            >
              {bookmark.read ? (
                <Check size={16} color="$green10" />
              ) : (
                <Circle size={16} color="$gray10" />
              )}
              <Text>{bookmark.read ? "Read" : "Mark Read"}</Text>
            </Button>
          )}

          <Button
            flex={1}
            variant="outlined"
            onPress={handleCopyLink}
            disabled={copying}
          >
            <Copy size={16} />
            <Text>{copying ? "Copied!" : "Copy"}</Text>
          </Button>
        </XStack>

        {/* Action Row 2 */}
        <XStack gap="$2" justifyContent="space-between">
          <Button flex={1} onPress={handleOpenLink} theme="blue" size="$4">
            <ExternalLink size={20} />
            <Text fontSize="$4" fontWeight="600">
              Open Link
            </Text>
          </Button>

          <Button
            variant="outlined"
            onPress={handleDeleteBookmark}
            theme="red"
            size="$4"
            disabled={deleteBookmarkMutation.isPending}
          >
            <Trash2 size={20} />
            <Text fontSize="$4" fontWeight="600">
              {deleteBookmarkMutation.isPending ? "Deleting..." : "Delete"}
            </Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
