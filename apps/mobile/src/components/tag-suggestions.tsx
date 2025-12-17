import { useQuery } from "@tanstack/react-query";
import { ScrollView } from "react-native";
import { XStack, YStack, Text, Button, Spinner } from "tamagui";
import { apiClient, Tag } from "../lib/api-client";

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
  const { data, isLoading } = useQuery({
    queryKey: ["tags", searchText],
    queryFn: () => apiClient.getTags({ q: searchText, limit: 20 }),
    enabled: true,
  });

  const filteredTags =
    data?.tags.filter((tag) => !selectedTags.includes(tag.name)) ?? [];

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
        {filteredTags.map((tag: Tag) => (
          <Button
            key={tag.id}
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
