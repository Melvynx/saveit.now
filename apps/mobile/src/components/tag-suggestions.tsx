import { useQuery } from "convex/react";
import { ScrollView } from "react-native";
import { XStack, YStack, Text, Button, Spinner } from "tamagui";
import { api } from "@convex/_generated/api";
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
      <YStack padding="$2" alignItems="center">
        <Spinner size="small" />
      </YStack>
    );
  }

  if (filteredTags.length === 0) {
    return (
      <YStack padding="$3" alignItems="center">
        <Text color="$gray10" fontSize="$2">
          No tags found
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <XStack gap="$2" paddingVertical="$2">
        {filteredTags.map((tag: any) => (
          <Button
            key={tag._id}
            size="$2"
            paddingHorizontal="$3"
            backgroundColor="$purple4"
            borderRadius="$10"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => onSelectTag(tag.name)}
          >
            <Text fontSize="$2" fontWeight="500" color="$purple11">
              #{tag.name}
            </Text>
          </Button>
        ))}
      </XStack>
    </ScrollView>
  );
}
