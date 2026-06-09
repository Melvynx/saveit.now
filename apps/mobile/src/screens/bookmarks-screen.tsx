import { useMutation, usePaginatedQuery, useAction } from "convex/react";
import {
  Share2,
  Globe,
  Bookmark as BookmarkIcon,
  X,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { api } from "@convex/_generated/api";
import { BookmarkItem } from "../components/bookmark-item";
import { TypeFilterBadges } from "../components/type-filter-badges";
import { TagSuggestions } from "../components/tag-suggestions";
import { useAuth } from "../contexts/AuthContext";
import type { BookmarkType } from "../lib/api-client";

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

// Convex bookmark shape mapped to the legacy Bookmark interface expected by components.
function toBookmarkShape(b: any) {
  return {
    ...b,
    id: b._id as string,
    createdAt: typeof b.createdAt === "number"
      ? new Date(b.createdAt).toISOString()
      : b.createdAt,
  };
}

export default function BookmarksScreen({
  searchQuery = "",
}: BookmarksScreenProps) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedTypes, setSelectedTypes] = useState<BookmarkType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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

  // Paginated list query (used when no search query).
  const {
    results: convexBookmarks,
    loadMore,
    status,
  } = usePaginatedQuery(
    api.bookmarks.queries.list,
    isAuthenticated && !debouncedSearchQuery
      ? {
          filter:
            selectedTypes.length > 0
              ? { types: selectedTypes as any[] }
              : undefined,
        }
      : "skip",
    { initialNumItems: 20 },
  );

  // Search action (used when query present).
  const searchAction = useAction(api.search.actions.search);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!debouncedSearchQuery && selectedTags.length === 0) {
      setSearchResults(null);
      return;
    }

    if (debouncedSearchQuery || selectedTags.length > 0) {
      setIsSearching(true);
      searchAction({
        query: debouncedSearchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        types: selectedTypes.length > 0 ? (selectedTypes as any[]) : undefined,
        limit: 20,
      })
        .then((res) => {
          setSearchResults(res.bookmarks ?? []);
        })
        .catch((err) => {
          console.error("Search error:", err);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }
  }, [debouncedSearchQuery, selectedTypes, selectedTags, isAuthenticated]);

  const updateBookmarkMutation = useMutation(api.bookmarks.mutations.update);

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

  const rawBookmarks = searchResults ?? convexBookmarks ?? [];
  const bookmarks = rawBookmarks.map(toBookmarkShape);

  const isLoading =
    (status === "LoadingFirstPage" && !debouncedSearchQuery) || isSearching;
  const isFetchingNextPage = status === "LoadingMore";
  const hasNextPage = status === "CanLoadMore";

  const handleRefresh = useCallback(() => {
    // Convex queries are reactive — refreshing is automatic.
    // For search results we re-trigger by clearing and re-setting.
    if (debouncedSearchQuery || selectedTags.length > 0) {
      setIsSearching(true);
      searchAction({
        query: debouncedSearchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        types: selectedTypes.length > 0 ? (selectedTypes as any[]) : undefined,
        limit: 20,
      })
        .then((res) => setSearchResults(res.bookmarks ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }
  }, [debouncedSearchQuery, selectedTags, selectedTypes, searchAction]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !searchResults) {
      loadMore(20);
    }
  };

  const handleBookmarkPress = (bookmark: any) => {
    router.push(`/bookmark/${bookmark.id}`);
  };

  const handleToggleStar = async (bookmark: any) => {
    try {
      await updateBookmarkMutation({
        id: bookmark._id ?? bookmark.id,
        patch: { starred: !bookmark.starred },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  const handleToggleRead = async (bookmark: any) => {
    try {
      await updateBookmarkMutation({
        id: bookmark._id ?? bookmark.id,
        patch: { read: !bookmark.read },
      });
    } catch {
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  const renderBookmark = ({ item }: { item: any }) => (
    <BookmarkItem
      bookmark={item}
      onPress={() => handleBookmarkPress(item)}
      onToggleStar={() => handleToggleStar(item)}
      onToggleRead={() => handleToggleRead(item)}
    />
  );

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
          keyExtractor={(item) => item.id ?? item._id}
          renderItem={renderBookmark}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
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
