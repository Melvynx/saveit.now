import { ScrollView } from "react-native";
import { XStack, Text, Button } from "tamagui";
import { BookmarkType, BOOKMARK_TYPES } from "../lib/api-client";

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

const TYPE_COLORS: Record<BookmarkType, string> = {
  PAGE: "$blue10",
  ARTICLE: "$green10",
  YOUTUBE: "$red10",
  TWEET: "$blue10",
  VIDEO: "$purple10",
  IMAGE: "$orange10",
  PDF: "$red10",
  PRODUCT: "$yellow10",
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
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      <XStack gap="$2">
        {BOOKMARK_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <Button
              key={type}
              size="$2"
              paddingHorizontal="$3"
              backgroundColor={isSelected ? TYPE_COLORS[type] : "$gray4"}
              borderRadius="$10"
              pressStyle={{ scale: 0.97 }}
              hoverStyle={{
                backgroundColor: isSelected ? TYPE_COLORS[type] : "$gray5",
              }}
              focusStyle={{ outlineWidth: 0 }}
              onPress={() => onToggleType(type)}
            >
              <Text
                fontSize="$2"
                fontWeight="500"
                color={isSelected ? "white" : "$gray11"}
              >
                {TYPE_LABELS[type]}
              </Text>
            </Button>
          );
        })}
      </XStack>
    </ScrollView>
  );
}
