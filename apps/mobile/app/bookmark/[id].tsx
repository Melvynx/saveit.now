import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookmarkDetailActionsDialog } from "../../src/components/bookmark-detail-actions-dialog";
import { BookmarkDetailContent } from "../../src/components/bookmark-detail-content";
import { Button } from "../../src/components/ui/button";
import { IconButton } from "../../src/components/ui/icon-button";
import { LoadingScreen } from "../../src/components/ui/loading";
import { StatusScreen } from "../../src/components/ui/status-screen";
import { Text } from "../../src/components/ui/text";
import { useBookmarkDetailActions } from "../../src/hooks/use-bookmark-detail-actions";
import { hapticSelection } from "../../src/lib/haptics";
import { useThemeColors } from "../../src/lib/theme";
import { getDomainName } from "../../src/lib/utils";

function formatBookmarkType(type: string | null) {
  if (!type) return "Bookmark";
  if (type === "YOUTUBE") return "YouTube";
  return `${type.charAt(0)}${type.slice(1).toLowerCase()}`;
}

function formatSavedDate(createdAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(createdAt));
}

export default function BookmarkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();

  // Reactive query — updates automatically during processing.
  const bookmark = useQuery(
    api.bookmarks.queries.get,
    id ? { id: id as Id<"bookmarks"> } : "skip",
  );
  const isLoading = bookmark === undefined;
  const {
    actionsOpen,
    copied,
    copying,
    closeActions,
    copyLink,
    deleteBookmarkWithConfirmation,
    openActions,
    openLink,
    saveNote,
    shareBookmark,
    toggleRead,
    toggleStar,
  } = useBookmarkDetailActions(bookmark);

  const preview =
    bookmark?.preview ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png";
  const faviconUrl =
    bookmark?.faviconUrl ||
    "https://codelynx.mlvcdn.com/images/2025-07-28/placeholder-favicon.png";

  const domainName = bookmark ? getDomainName(bookmark.url) : "";
  const isWide = width >= 700;
  const panelHeight = Math.min(height * 0.9, 800);

  return (
    <View className="flex-1 justify-end">
      <BlurView
        intensity={28}
        tint={colors.isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View className="bg-black/20" style={StyleSheet.absoluteFill} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close bookmark details"
        onPress={() => router.back()}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeInDown.duration(240)}
        accessibilityViewIsModal
        className="self-center overflow-hidden border border-border bg-background"
        style={{
          width: isWide ? Math.min(width - 64, 620) : "100%",
          height: panelHeight,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          borderBottomLeftRadius: isWide ? 30 : 0,
          borderBottomRightRadius: isWide ? 30 : 0,
          marginBottom: isWide ? 24 : 0,
          shadowColor: "#000000",
          shadowOpacity: colors.isDark ? 0.5 : 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -8 },
          elevation: 20,
        }}
      >
        {isLoading ? (
          <LoadingScreen />
        ) : !bookmark ? (
          <StatusScreen
            icon="alert-circle-outline"
            title="Something went wrong"
            message="Failed to load bookmark"
            footer={
              <Button onPress={() => router.back()} className="self-stretch">
                Go Back
              </Button>
            }
          />
        ) : (
          <>
            <View className="items-center pb-1 pt-2">
              <View className="h-[5px] w-10 rounded-full bg-border" />
            </View>

            <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
              <Image
                source={{ uri: faviconUrl }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                }}
              />
              <View className="flex-1 gap-0.5">
                <Text
                  numberOfLines={1}
                  className="font-sans-semibold text-[13px] text-foreground"
                >
                  {domainName}
                </Text>
                <Text className="font-sans text-[11px] text-muted-foreground">
                  Saved {formatSavedDate(bookmark.createdAt)} ·{" "}
                  {formatBookmarkType(bookmark.type)}
                </Text>
              </View>
              <IconButton
                icon="close"
                size="lg"
                accessibilityLabel="Close bookmark details"
                onPress={() => router.back()}
              />
            </View>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 12) + 100,
              }}
            >
              <View className="gap-5 px-4 pt-1">
                <Animated.View entering={FadeInDown.duration(280).delay(40)}>
                  <BookmarkDetailContent
                    bookmark={bookmark}
                    preview={preview}
                    faviconUrl={faviconUrl}
                  />
                </Animated.View>

                <Animated.View
                  entering={FadeInDown.duration(280).delay(120)}
                  className="flex-row items-start gap-3"
                >
                  <Text
                    numberOfLines={3}
                    className="flex-1 font-sans-semibold text-[19px] leading-[24px] text-foreground"
                  >
                    {bookmark.title || domainName}
                  </Text>
                  {(bookmark.type === "ARTICLE" ||
                    bookmark.type === "YOUTUBE") && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        bookmark.read
                          ? "Mark bookmark as unread"
                          : "Mark bookmark as read"
                      }
                      accessibilityState={{ selected: bookmark.read }}
                      onPress={() => {
                        hapticSelection();
                        void toggleRead();
                      }}
                      className={
                        bookmark.read
                          ? "min-h-11 flex-row items-center gap-1.5 rounded-full bg-success/10 px-3 active:scale-[0.96] active:opacity-80"
                          : "min-h-11 flex-row items-center gap-1.5 rounded-full bg-secondary px-3 active:scale-[0.96] active:opacity-80"
                      }
                    >
                      <Ionicons
                        name={
                          bookmark.read ? "checkmark-circle" : "ellipse-outline"
                        }
                        size={17}
                        color={
                          bookmark.read ? "#10B981" : colors.mutedForeground
                        }
                      />
                      <Text
                        className={
                          bookmark.read
                            ? "font-sans-semibold text-[12px] text-success"
                            : "font-sans-semibold text-[12px] text-muted-foreground"
                        }
                      >
                        {bookmark.read ? "Read" : "Mark read"}
                      </Text>
                    </Pressable>
                  )}
                </Animated.View>

                {bookmark.summary ? (
                  <Animated.View
                    entering={FadeInDown.duration(280).delay(200)}
                    className="gap-2"
                  >
                    <Text variant="section-label">Summary</Text>
                    <View className="rounded-2xl bg-secondary px-5 py-4">
                      <Text className="font-sans text-[14px] leading-[21px] text-foreground">
                        {bookmark.summary}
                      </Text>
                    </View>
                  </Animated.View>
                ) : null}

                {bookmark.note ? (
                  <Animated.View
                    entering={FadeInDown.duration(280).delay(280)}
                    className="gap-2"
                  >
                    <Text variant="section-label">Note</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit personal note"
                      onPress={openActions}
                      className="min-h-11 rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.96] active:opacity-80"
                    >
                      <Text className="font-sans text-[14px] leading-[21px] text-foreground">
                        {bookmark.note}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ) : null}

                {bookmark.tags.length > 0 ? (
                  <Animated.View
                    entering={FadeInDown.duration(280).delay(360)}
                    className="gap-2"
                  >
                    <Text variant="section-label">Tags</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {bookmark.tags.map((tagWrapper) => (
                        <View
                          key={tagWrapper.tag.id}
                          className="rounded-full border border-border bg-card px-3.5 py-1.5"
                        >
                          <RNText className="font-sans-semibold text-[13px] text-foreground">
                            #{tagWrapper.tag.name}
                          </RNText>
                        </View>
                      ))}
                    </View>
                  </Animated.View>
                ) : null}
              </View>
            </ScrollView>

            <View
              className="absolute left-3 right-3 flex-row items-center gap-2 rounded-full bg-card p-2"
              style={{
                bottom: Math.max(insets.bottom, 10) + 8,
                shadowColor: "#000000",
                shadowOpacity: colors.isDark ? 0.5 : 0.14,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              <Button
                size="sm"
                accessibilityLabel="Open original link"
                onPress={openLink}
                className="min-h-11 flex-1 gap-2 px-4 py-0 active:scale-[0.96]"
              >
                <Ionicons
                  name="open-outline"
                  size={17}
                  color={colors.primaryForeground}
                />
                <Text className="font-sans-bold text-[14px] text-primary-foreground">
                  Open
                </Text>
              </Button>
              <IconButton
                icon={bookmark.starred ? "star" : "star-outline"}
                size="lg"
                color={bookmark.starred ? "#F59E0B" : undefined}
                accessibilityLabel={
                  bookmark.starred ? "Unstar bookmark" : "Star bookmark"
                }
                accessibilityState={{ selected: bookmark.starred }}
                onPress={toggleStar}
              />
              <IconButton
                icon={copied ? "checkmark" : "copy-outline"}
                size="lg"
                color={copied ? "#10B981" : undefined}
                disabled={copying}
                accessibilityLabel={
                  copied ? "Link copied" : "Copy bookmark link"
                }
                onPress={copyLink}
              />
              <IconButton
                icon="ellipsis-horizontal"
                size="lg"
                accessibilityLabel="More bookmark actions"
                accessibilityHint="Edit note, share, or delete bookmark"
                onPress={openActions}
              />
            </View>
          </>
        )}
      </Animated.View>

      {bookmark ? (
        <BookmarkDetailActionsDialog
          visible={actionsOpen}
          note={bookmark.note}
          onClose={closeActions}
          onSaveNote={saveNote}
          onShare={shareBookmark}
          onDelete={deleteBookmarkWithConfirmation}
        />
      ) : null}
    </View>
  );
}
