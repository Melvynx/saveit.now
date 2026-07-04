import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { type Bookmark } from "../lib/api-client";
import { BOOKMARK_STEPS } from "../lib/bookmark-steps";
import { hapticSelection } from "../lib/haptics";
import { useThemeColors } from "../lib/theme";
import { getDomainName } from "../lib/utils";
import { LoadingSpinner } from "./ui/loading";

interface BookmarkItemPendingProps {
  bookmark: Bookmark;
  onPress: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
}

type StepStatus = "complete" | "active" | "upcoming";

function getCurrentStepIndex(processingStep: number | null | undefined) {
  const step = BOOKMARK_STEPS.find((item) => item.order === processingStep);
  return step?.order ?? 0;
}

function getVisibleSteps(currentStepIndex: number) {
  const windowSize = 3;
  const maxStart = Math.max(BOOKMARK_STEPS.length - windowSize, 0);
  const start = Math.min(Math.max(currentStepIndex - 1, 0), maxStart);

  return BOOKMARK_STEPS.slice(start, start + windowSize);
}

function PendingActionButton({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full border border-border bg-background active:opacity-70"
    >
      <Ionicons name={icon} size={15} color={color ?? colors.mutedForeground} />
    </Pressable>
  );
}

function PendingStep({ label, status }: { label: string; status: StepStatus }) {
  const colors = useThemeColors();
  const isActive = status === "active";

  return (
    <View className="flex-row items-center gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-secondary">
        {isActive ? (
          <LoadingSpinner size="small" color={colors.foreground} />
        ) : status === "complete" ? (
          <Ionicons name="checkmark" size={16} color={colors.mutedForeground} />
        ) : (
          <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-50" />
        )}
      </View>
      <Text
        numberOfLines={1}
        className={
          isActive
            ? "flex-1 font-sans-semibold text-[14px] text-foreground"
            : "flex-1 font-sans text-[14px] text-muted-foreground"
        }
      >
        {label}
      </Text>
    </View>
  );
}

export function BookmarkItemPending({
  bookmark,
  onPress,
  onToggleStar,
  onToggleRead,
}: BookmarkItemPendingProps) {
  const colors = useThemeColors();
  const domainName = getDomainName(bookmark.url);
  const currentStepIndex = getCurrentStepIndex(bookmark.processingStep);
  const progress = ((currentStepIndex + 1) / BOOKMARK_STEPS.length) * 100;
  const visibleSteps = getVisibleSteps(currentStepIndex);
  const title = bookmark.title || bookmark.url;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-border bg-card active:opacity-90"
    >
      <View className="relative h-[180px] bg-muted px-4 py-4">
        <View className="h-1 overflow-hidden rounded-full bg-secondary">
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: colors.primary }}
          />
        </View>

        <View className="flex-1 justify-center">
          <View className="gap-2.5">
            {visibleSteps.map((step) => {
              const status: StepStatus =
                step.order < currentStepIndex
                  ? "complete"
                  : step.order === currentStepIndex
                    ? "active"
                    : "upcoming";

              return (
                <PendingStep key={step.id} label={step.name} status={status} />
              );
            })}
          </View>
        </View>

        <View className="absolute right-2 top-2 flex-row gap-1.5">
          <PendingActionButton
            icon={bookmark.starred ? "star" : "star-outline"}
            color={bookmark.starred ? "#F59E0B" : undefined}
            onPress={onToggleStar}
          />
          {(bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") && (
            <PendingActionButton
              icon={bookmark.read ? "checkmark-circle" : "ellipse-outline"}
              color={bookmark.read ? "#10B981" : undefined}
              onPress={onToggleRead}
            />
          )}
        </View>
      </View>

      <View className="flex-row items-start gap-3 px-4 py-3.5">
        {bookmark.faviconUrl ? (
          <Image
            source={{ uri: bookmark.faviconUrl }}
            style={{ width: 24, height: 24, borderRadius: 6, marginTop: 2 }}
          />
        ) : (
          <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-md bg-secondary">
            <Ionicons
              name="globe-outline"
              size={14}
              color={colors.mutedForeground}
            />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text
            numberOfLines={1}
            className="font-sans text-[13px] text-muted-foreground"
          >
            {domainName}
          </Text>
          <Text
            numberOfLines={2}
            className="font-sans-semibold text-[15px] text-foreground"
          >
            {title}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
          style={{ marginTop: 6 }}
        />
      </View>
    </Pressable>
  );
}
