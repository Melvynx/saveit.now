import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { BookmarkItem } from "../components/bookmark-item";
import { apiClient, type Bookmark } from "../lib/api-client";

export default function BookmarksScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();

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
    router.push(`/bookmark/${bookmark.id}`);
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
    <YStack flex={1}>
      <XStack
        padding="$4"
        gap="$2"
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

      {isLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color="$gray10">Loading bookmarks...</Text>
        </YStack>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              colors={["#007AFF"]}
            />
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
      )}
    </YStack>
  );
}
