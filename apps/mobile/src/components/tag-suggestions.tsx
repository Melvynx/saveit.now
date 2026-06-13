import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LoadingSpinner } from "./ui/loading";
import { useAuth } from "../contexts/AuthContext";

interface TagSuggestionsProps {
  searchText: string;
  selectedTags: string[];
  onSelectTag: (tagName: string) => void;
}

export function TagSuggestions({
  searchText,
  selectedTags,
  onSelectTag,
}: TagSuggestionsProps) {
  const { isAuthenticated } = useAuth();

  const result = useQuery(
    api.tags.queries.list,
    isAuthenticated
      ? {
          paginationOpts: { numItems: 20, cursor: null },
          query: searchText || undefined,
        }
      : "skip",
  );

  const isLoading = result === undefined;
  const filteredTags =
    result?.page.filter((tag: any) => !selectedTags.includes(tag.name)) ?? [];

  if (isLoading) {
    return (
      <View className="items-center p-2">
        <LoadingSpinner size="small" />
      </View>
    );
  }

  if (filteredTags.length === 0) {
    return (
      <View className="items-center p-3">
        <Text className="font-sans text-[13px] text-muted-foreground">
          No tags found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <View className="flex-row gap-2 py-2">
        {filteredTags.map((tag: any) => (
          <Pressable
            key={tag._id}
            onPress={() => onSelectTag(tag.name)}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 active:opacity-70"
          >
            <Text className="font-sans-semibold text-[13px] text-foreground">
              #{tag.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
