import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { memo } from "react";
import { Pressable, View } from "react-native";

import { useOpenUpgrade } from "../hooks/use-open-upgrade";
import { useThemeColors } from "../lib/theme";
import { Text } from "./ui/text";

type BookmarkLimitCardProps = {
  bookmarkCount: number;
  bookmarkLimit: number;
  onPress: () => void | Promise<void>;
};

export function BookmarkLimitCard({
  bookmarkCount,
  bookmarkLimit,
  onPress,
}: BookmarkLimitCardProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Free plan limit reached. ${bookmarkCount} of ${bookmarkLimit} bookmarks used. Upgrade to Pro.`}
      onPress={() => void onPress()}
      className="overflow-hidden rounded-3xl bg-primary p-5 active:scale-[0.96] active:opacity-90"
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-row items-start gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/15">
          <Ionicons
            name="lock-closed"
            size={22}
            color={colors.primaryForeground}
          />
        </View>

        <View className="flex-1 gap-2">
          <Text
            selectable
            className="font-sans-bold text-[12px] uppercase tracking-[1.2px] text-primary-foreground/75"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            Free plan · {bookmarkCount}/{bookmarkLimit}
          </Text>
          <Text
            selectable
            className="font-sans-bold text-[22px] leading-[27px] text-primary-foreground"
          >
            You&apos;ve reached your bookmark limit
          </Text>
          <Text
            selectable
            className="font-sans text-[14px] leading-5 text-primary-foreground/80"
          >
            Upgrade to Pro to keep saving links and unlock up to 50,000
            bookmarks.
          </Text>
        </View>
      </View>

      <View className="mt-5 min-h-12 flex-row items-center justify-between rounded-2xl bg-primary-foreground px-4 py-3">
        <Text className="font-sans-bold text-[15px] text-primary">
          Upgrade to Pro
        </Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </View>
    </Pressable>
  );
}

export const BookmarkLimitListHeader = memo(function BookmarkLimitListHeader({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const openUpgrade = useOpenUpgrade();
  const userPlan = useQuery(
    api.subscriptions.queries.getUserPlan,
    isAuthenticated ? {} : "skip",
  );
  const bookmarkCount = useQuery(
    api.bookmarks.queries.count,
    isAuthenticated ? {} : "skip",
  );
  const bookmarkLimit = userPlan?.limits.bookmarks;
  const hasReachedBookmarkLimit =
    userPlan?.plan === "free" &&
    typeof bookmarkCount === "number" &&
    typeof bookmarkLimit === "number" &&
    bookmarkCount >= bookmarkLimit;

  if (!hasReachedBookmarkLimit) return null;

  return (
    <BookmarkLimitCard
      bookmarkCount={bookmarkCount}
      bookmarkLimit={bookmarkLimit}
      onPress={openUpgrade}
    />
  );
});
