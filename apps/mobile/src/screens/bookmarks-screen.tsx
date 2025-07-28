import { Check, Circle, Star } from "@tamagui/lucide-icons";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { Button, Card, H5, Input, Text, XStack, YStack } from "tamagui";
import { apiClient, type Bookmark } from "../lib/api-client";

interface BookmarkItemProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

function BookmarkItem({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemProps) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      marginBottom="$3"
      pressStyle={{ scale: 0.98 }}
      onPress={onPress}
    >
      <Card.Header>
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} marginRight="$3">
            <H5 size="$5" numberOfLines={2}>
              {bookmark.title || bookmark.url}
            </H5>
          </YStack>

          <XStack space="$2">
            <Button
              size="$3"
              circular
              variant={bookmark.starred ? "outlined" : "outlined"}
              onPress={onToggleStar}
              theme={bookmark.starred ? "yellow" : undefined}
            >
              <Star
                size={16}
                color={bookmark.starred ? "$yellow10" : "$gray10"}
              />
            </Button>

            <Button
              size="$3"
              circular
              variant={bookmark.read ? "outlined" : "outlined"}
              onPress={onToggleRead}
              theme={bookmark.read ? "green" : undefined}
            >
              {bookmark.read ? (
                <Check size={16} color="$green10" />
              ) : (
                <Circle size={16} color="$gray10" />
              )}
            </Button>
          </XStack>
        </XStack>

        <Text color="$gray10" numberOfLines={1} marginTop="$2">
          {bookmark.url}
        </Text>

        {bookmark.tags && bookmark.tags.length > 0 && (
          <XStack flexWrap="wrap" gap="$2" marginTop="$3">
            {bookmark.tags.slice(0, 3).map((tagWrapper) => (
              <YStack
                key={tagWrapper.tag.id}
                backgroundColor="$blue5"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                <Text fontSize="$2" color="$blue11">
                  {tagWrapper.tag.name}
                </Text>
              </YStack>
            ))}
            {bookmark.tags.length > 3 && (
              <Text color="$gray10" fontStyle="italic">
                +{bookmark.tags.length - 3} more
              </Text>
            )}
          </XStack>
        )}

        <Text color="$gray8" marginTop="$2">
          {new Date(bookmark.createdAt).toLocaleDateString()}
        </Text>
      </Card.Header>
    </Card>
  );
}

export default function BookmarksScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["bookmarks", debouncedSearchQuery],
    queryFn: async ({ pageParam }) => {
      console.log("OLALALA TU ES SUPER !", pageParam);
      return await apiClient.getBookmarks({
        query: debouncedSearchQuery || undefined,
        cursor: pageParam,
        limit: 20,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  const updateBookmarkMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Bookmark>;
    }) => {
      return await apiClient.updateBookmark(id, updates);
    },
    onSuccess: (updatedBookmark) => {
      // Update the bookmark in all pages of the cache
      queryClient.setQueryData(
        ["bookmarks", debouncedSearchQuery],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              bookmarks: page.bookmarks.map((bookmark: Bookmark) =>
                bookmark.id === updatedBookmark.id ? updatedBookmark : bookmark,
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

  const bookmarks = data?.pages.flatMap((page) => page.bookmarks) ?? [];

  const handleRefresh = async () => {
    await refetch();
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSearch = () => {
    setDebouncedSearchQuery(searchQuery);
  };

  const handleBookmarkPress = (bookmark: Bookmark) => {
    // TODO: Navigate to bookmark detail screen
    Alert.alert("Bookmark", `Opening: ${bookmark.title || bookmark.url}`);
  };

  const handleToggleStar = async (bookmark: Bookmark) => {
    updateBookmarkMutation.mutate({
      id: bookmark.id,
      updates: { starred: !bookmark.starred },
    });
  };

  const handleToggleRead = async (bookmark: Bookmark) => {
    updateBookmarkMutation.mutate({
      id: bookmark.id,
      updates: { read: !bookmark.read },
    });
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <BookmarkItem
      bookmark={item}
      onPress={() => handleBookmarkPress(item)}
      onToggleStar={() => handleToggleStar(item)}
      onToggleRead={() => handleToggleRead(item)}
    />
  );

  if (isLoading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <Text color="$gray10">Loading bookmarks...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
        space="$4"
      >
        <Text color="$red10">Failed to load bookmarks</Text>
        <Button onPress={() => refetch()} theme="blue">
          Retry
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        padding="$4"
        space="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Input
          flex={1}
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          size="$4"
        />
        <Button onPress={handleSearch} theme="blue" size="$4">
          Search
        </Button>
      </XStack>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmark}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <YStack alignItems="center" padding="$4">
              <Text color="$gray10">Loading more...</Text>
            </YStack>
          ) : null
        }
        ListEmptyComponent={
          <YStack alignItems="center" marginTop="$8" space="$4">
            <Text fontWeight="600" color="$gray10">
              No bookmarks found
            </Text>
            <Text color="$gray8" textAlign="center">
              {searchQuery
                ? "Try a different search term"
                : "Start saving your first bookmark!"}
            </Text>
          </YStack>
        }
      />
    </YStack>
  );
}
