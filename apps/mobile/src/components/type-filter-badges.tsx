import { Pressable, ScrollView, Text, View } from "react-native";
import { hapticSelection } from "../lib/haptics";
import { cn } from "../lib/utils";
import { BOOKMARK_TYPES, BookmarkType } from "../lib/api-client";

const TYPE_LABELS: Record<BookmarkType, string> = {
  PAGE: "Pages",
  ARTICLE: "Articles",
  YOUTUBE: "YouTube",
  TWEET: "Tweets",
  VIDEO: "Videos",
  IMAGE: "Images",
  PDF: "PDFs",
  PRODUCT: "Products",
};

interface TypeFilterBadgesProps {
  selectedTypes: BookmarkType[];
  onToggleType: (type: BookmarkType) => void;
}

export function TypeFilterBadges({
  selectedTypes,
  onToggleType,
}: TypeFilterBadgesProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <View className="flex-row gap-2">
        {BOOKMARK_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => {
                hapticSelection();
                onToggleType(type);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 active:opacity-80",
                isSelected ? "bg-primary" : "bg-secondary",
              )}
            >
              <Text
                className={cn(
                  "font-sans-semibold text-[13px]",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {TYPE_LABELS[type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
