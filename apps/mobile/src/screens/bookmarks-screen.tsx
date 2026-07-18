import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import { useAction, useMutation, usePaginatedQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookmarkItem } from "../components/bookmark-item";
import { TagSuggestions } from "../components/tag-suggestions";
import { TypeFilterBadges } from "../components/type-filter-badges";
import { LoadingSpinner } from "../components/ui/loading";
import { Text } from "../components/ui/text";
import { useAuth } from "../contexts/AuthContext";
import type { BookmarkType } from "../lib/api-client";
import { useThemeColors } from "../lib/theme";

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
    createdAt:
      typeof b.createdAt === "number"
        ? new Date(b.createdAt).toISOString()
        : b.createdAt,
  };
}

export default function BookmarksScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<BookmarkType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(insets.top + 170);

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

  const runSearch = useCallback(() => {
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
  }, [debouncedSearchQuery, selectedTags, selectedTypes, searchAction]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!debouncedSearchQuery && selectedTags.length === 0) {
      setSearchResults(null);
      return;
    }

    runSearch();
  }, [debouncedSearchQuery, selectedTags, isAuthenticated, runSearch]);

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
    setSearchQuery((prev) => prev.replace(/#\S*$/, "").trim());
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
    // For search results we re-trigger the search action.
    if (debouncedSearchQuery || selectedTags.length > 0) {
      runSearch();
    }
  }, [debouncedSearchQuery, selectedTags, runSearch]);

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
    <View className="flex-1 bg-background">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id ?? item._id}
          renderItem={renderBookmark}
          contentContainerStyle={{
            paddingTop: headerHeight + 4,
            paddingHorizontal: 16,
            paddingBottom: 85 + 24,
            gap: 12,
          }}
          scrollIndicatorInsets={{ top: headerHeight, bottom: 85 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              progressViewOffset={headerHeight}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <LoadingSpinner size="small" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            debouncedSearchQuery ? (
              <View className="mt-16 items-center gap-2 px-6">
                <Text
                  variant="title"
                  className="text-center text-[20px] leading-[26px]"
                >
                  No bookmarks found
                </Text>
                <Text variant="subtitle" className="text-center">
                  Try a different search term
                </Text>
              </View>
            ) : (
              <View className="mt-6 gap-5">
                <View className="items-center gap-4 rounded-2xl bg-secondary px-6 py-8">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                    <Ionicons
                      name="rocket-outline"
                      size={26}
                      color={colors.primaryForeground}
                    />
                  </View>
                  <Text className="text-center font-sans-bold text-[20px] text-foreground">
                    Let&apos;s fill your library
                  </Text>
                  <Text className="max-w-[280px] text-center font-sans text-[14px] text-muted-foreground">
                    Three quick steps and SaveIt starts working for you.
                  </Text>
                </View>

                <View className="gap-2.5">
                  <Text variant="section-label" className="mb-1 text-center">
                    Get started
                  </Text>
                  <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Ionicons
                        name="share-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[14px] text-foreground">
                        Save your first link
                      </Text>
                      <Text className="font-sans text-[12.5px] text-muted-foreground">
                        Tap Share on any page, then pick SaveIt.
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[14px] text-foreground">
                        Ask the AI a question
                      </Text>
                      <Text className="font-sans text-[12.5px] text-muted-foreground">
                        Search everything you saved in plain words.
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Ionicons
                        name="globe-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[14px] text-foreground">
                        Add the browser extension
                      </Text>
                      <Text className="font-sans text-[12.5px] text-muted-foreground">
                        Save from your desktop in one click.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          }
        />
      )}

      {/* Floating glass header — list scrolls underneath */}
      <View
        className="absolute left-0 right-0 top-0 z-10"
        onLayout={(e) =>
          setHeaderHeight(Math.round(e.nativeEvent.layout.height))
        }
      >
        <BlurView
          intensity={50}
          tint={colors.isDark ? "dark" : "light"}
          style={{
            paddingTop: insets.top + 8,
            backgroundColor: colors.isDark
              ? "rgba(10, 10, 10, 0.35)"
              : "rgba(255, 255, 255, 0.35)",
          }}
        >
          <View className="px-4 pb-3 pt-2">
            <Text variant="title" className="mb-4">
              Bookmarks
            </Text>
            <View className="flex-row items-center gap-2 rounded-xl bg-secondary/80 px-4">
              <Ionicons
                name="search"
                size={18}
                color={colors.mutedForeground}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search bookmarks..."
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{
                  minHeight: 44,
                  flex: 1,
                  color: colors.foreground,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 15,
                  lineHeight: 20,
                  letterSpacing: 0,
                }}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="gap-2 pb-3">
            <TypeFilterBadges
              selectedTypes={selectedTypes}
              onToggleType={handleToggleType}
            />
            {selectedTags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 px-4">
                {selectedTags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => handleRemoveTag(tag)}
                    className="flex-row items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 active:opacity-80"
                  >
                    <Text className="font-sans-semibold text-[13px] text-primary-foreground">
                      #{tag}
                    </Text>
                    <Ionicons
                      name="close"
                      size={13}
                      color={colors.primaryForeground}
                    />
                  </Pressable>
                ))}
              </View>
            )}
            {showTagSuggestions && (
              <TagSuggestions
                searchText={hashtagSearch ?? ""}
                selectedTags={selectedTags}
                onSelectTag={handleSelectTag}
              />
            )}
          </View>

          <View className="h-px bg-border/50" />
        </BlurView>
      </View>
    </View>
  );
}
