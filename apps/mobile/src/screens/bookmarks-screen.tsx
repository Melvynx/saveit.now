import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Share2,
  Globe,
  Bookmark as BookmarkIcon,
  X,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { BookmarkItem } from "../components/bookmark-item";
import { TypeFilterBadges } from "../components/type-filter-badges";
import { TagSuggestions } from "../components/tag-suggestions";
import {
  apiClient,
  BookmarksResponse,
  type Bookmark,
  type BookmarkType,
} from "../lib/api-client";

interface BookmarksScreenProps {
  searchQuery?: string;
}

function parseHashtagQuery(query: string): {
  cleanQuery: string;
  hashtagSearch: string | null;
} {
  const hashMatch = query.match(/#(\S*)$/);
  if (hashMatch && hashMatch.index !== undefined) {
    const cleanQuery = query.slice(0, hashMatch.index).trim();
    return { cleanQuery, hashtagSearch: hashMatch[1] ?? null };
  }
  return { cleanQuery: query, hashtagSearch: null };
}

export default function BookmarksScreen({
  searchQuery = "",
}: BookmarksScreenProps) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedTypes, setSelectedTypes] = useState<BookmarkType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { cleanQuery, hashtagSearch } = useMemo(
    () => parseHashtagQuery(searchQuery),
    [searchQuery],
  );

  const showTagSuggestions = hashtagSearch !== null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(cleanQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [cleanQuery]);

  const handleToggleType = (type: BookmarkType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSelectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName]);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagName));
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["bookmarks", debouncedSearchQuery, selectedTypes, selectedTags],
    queryFn: async ({ pageParam }) => {
      return await apiClient.getBookmarks({
        query: debouncedSearchQuery || undefined,
        cursor: pageParam,
        limit: 20,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
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
        (oldData: { pages: BookmarksResponse[] }) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
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
    <YStack flex={1} paddingTop="$2">
      <YStack gap="$2" paddingBottom="$2">
        <TypeFilterBadges
          selectedTypes={selectedTypes}
          onToggleType={handleToggleType}
        />
        {selectedTags.length > 0 && (
          <XStack gap="$2" paddingHorizontal="$4" flexWrap="wrap">
            {selectedTags.map((tag) => (
              <Button
                key={tag}
                size="$2"
                paddingHorizontal="$3"
                backgroundColor="$purple10"
                borderRadius="$10"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => handleRemoveTag(tag)}
                iconAfter={<X size={12} color="white" />}
              >
                <Text fontSize="$2" fontWeight="500" color="white">
                  #{tag}
                </Text>
              </Button>
            ))}
          </XStack>
        )}
        {showTagSuggestions && (
          <TagSuggestions
            searchText={hashtagSearch ?? ""}
            selectedTags={selectedTags}
            onSelectTag={handleSelectTag}
          />
        )}
      </YStack>
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
            debouncedSearchQuery ? (
              <YStack alignItems="center" marginTop="$8" gap="$4">
                <Text fontWeight="600" color="$gray10">
                  No bookmarks found
                </Text>
                <Text color="$gray8" textAlign="center">
                  Try a different search term
                </Text>
              </YStack>
            ) : (
              <YStack alignItems="center" marginTop="$6" gap="$5" padding="$4">
                <YStack
                  backgroundColor="$backgroundHover"
                  padding="$6"
                  borderRadius="$6"
                  alignItems="center"
                  gap="$4"
                  width="100%"
                >
                  <YStack
                    backgroundColor="$primary"
                    padding="$3"
                    borderRadius="$4"
                  >
                    <BookmarkIcon size={32} color="white" />
                  </YStack>
                  <Text fontSize="$6" fontWeight="600" textAlign="center">
                    Add your first bookmark
                  </Text>
                  <Text color="$gray10" textAlign="center" maxWidth={280}>
                    Share any link from your browser or apps to save it here
                  </Text>
                </YStack>

                <YStack gap="$3" width="100%">
                  <Text
                    fontSize="$3"
                    fontWeight="600"
                    color="$gray11"
                    textAlign="center"
                  >
                    How to save bookmarks:
                  </Text>
                  <XStack gap="$3" alignItems="center">
                    <YStack
                      backgroundColor="$gray4"
                      padding="$2"
                      borderRadius="$3"
                    >
                      <Share2 size={18} color="$gray11" />
                    </YStack>
                    <Text color="$gray10" flex={1} fontSize="$3">
                      Tap the share button on any webpage or content
                    </Text>
                  </XStack>
                  <XStack gap="$3" alignItems="center">
                    <YStack
                      backgroundColor="$gray4"
                      padding="$2"
                      borderRadius="$3"
                    >
                      <Globe size={18} color="$gray11" />
                    </YStack>
                    <Text color="$gray10" flex={1} fontSize="$3">
                      Use our browser extension on desktop
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            )
          }
        />
      )}
    </YStack>
  );
}
