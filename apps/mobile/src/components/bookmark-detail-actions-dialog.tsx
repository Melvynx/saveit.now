import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "../lib/theme";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { Input } from "./ui/input";
import { Text } from "./ui/text";

type BookmarkDetailActionsDialogProps = {
  visible: boolean;
  note: string | null;
  onClose: () => void;
  onSaveNote: (note: string | null) => Promise<void>;
  onShare: () => void | Promise<void>;
  onDelete: () => void;
};

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  destructive?: boolean;
  onPress: () => void;
};

type PendingAction = "share" | "delete";

const ANDROID_MODAL_DISMISS_DELAY_MS = 300;

function ActionRow({
  icon,
  label,
  description,
  destructive = false,
  onPress,
}: ActionRowProps) {
  const colors = useThemeColors();
  const color = destructive ? colors.destructive : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 rounded-2xl px-3 py-2.5 active:scale-[0.96] active:bg-secondary active:opacity-80"
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          className={
            destructive
              ? "font-sans-semibold text-[15px] text-destructive"
              : "font-sans-semibold text-[15px] text-foreground"
          }
        >
          {label}
        </Text>
        <Text className="font-sans text-[12px] leading-[17px] text-muted-foreground">
          {description}
        </Text>
      </View>
      {!destructive ? (
        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}

export function BookmarkDetailActionsDialog({
  visible,
  note,
  onClose,
  onSaveNote,
  onShare,
  onDelete,
}: BookmarkDetailActionsDialogProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<"menu" | "note">("menu");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const androidDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const runPendingAction = useCallback(() => {
    const pendingAction = pendingActionRef.current;
    if (!pendingAction) return;

    pendingActionRef.current = null;
    if (androidDismissTimerRef.current) {
      clearTimeout(androidDismissTimerRef.current);
      androidDismissTimerRef.current = null;
    }

    if (pendingAction === "share") {
      void onShare();
      return;
    }

    onDelete();
  }, [onDelete, onShare]);

  useEffect(() => {
    if (!visible) return;
    pendingActionRef.current = null;
    setMode("menu");
    setDraft(note ?? "");
    setError(null);
  }, [note, visible]);

  useEffect(() => {
    if (visible || Platform.OS === "ios" || !pendingActionRef.current) {
      return;
    }

    // React Native only emits Modal.onDismiss on iOS. Let Android finish its
    // native fade before presenting the share sheet or delete confirmation.
    androidDismissTimerRef.current = setTimeout(
      runPendingAction,
      ANDROID_MODAL_DISMISS_DELAY_MS,
    );

    return () => {
      if (androidDismissTimerRef.current) {
        clearTimeout(androidDismissTimerRef.current);
        androidDismissTimerRef.current = null;
      }
    };
  }, [runPendingAction, visible]);

  const close = () => {
    if (!saving) onClose();
  };

  const saveNote = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const nextNote = draft.trim();
      await onSaveNote(nextNote.length > 0 ? nextNote : null);
      onClose();
    } catch {
      setError("Couldn’t save your note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const queueAfterDismiss = (action: PendingAction) => {
    if (pendingActionRef.current) return;
    pendingActionRef.current = action;
    onClose();
  };

  const share = () => queueAfterDismiss("share");

  const remove = () => queueAfterDismiss("delete");

  const isWide = width >= 700;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={close}
      onDismiss={runPendingAction}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        <View style={styles.modalRoot}>
          <BlurView
            intensity={28}
            tint={colors.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View className="bg-black/15" style={StyleSheet.absoluteFill} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close bookmark actions"
            disabled={saving}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View
            entering={FadeInDown.duration(220)}
            accessibilityViewIsModal
            className="self-center overflow-hidden border border-border bg-background px-4 pt-2"
            style={{
              width: isWide ? Math.min(width - 48, 480) : width - 24,
              maxHeight: height * 0.72,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: isWide ? 28 : 0,
              borderBottomRightRadius: isWide ? 28 : 0,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
              shadowColor: "#000000",
              shadowOpacity: colors.isDark ? 0.48 : 0.16,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: -8 },
              elevation: 18,
            }}
          >
            <View className="mb-1 items-center py-1">
              <View className="h-[5px] w-10 rounded-full bg-border" />
            </View>

            <View className="mb-2 flex-row items-center justify-between">
              {mode === "note" ? (
                <IconButton
                  icon="arrow-back"
                  size="lg"
                  disabled={saving}
                  accessibilityLabel="Back to bookmark actions"
                  onPress={() => setMode("menu")}
                />
              ) : (
                <View className="h-11 w-11" />
              )}
              <Text className="flex-1 text-center font-sans-bold text-[19px] text-foreground">
                {mode === "note" ? "Edit note" : "Bookmark actions"}
              </Text>
              <IconButton
                icon="close"
                size="lg"
                disabled={saving}
                accessibilityLabel="Close bookmark actions"
                onPress={close}
              />
            </View>

            {mode === "menu" ? (
              <View className="gap-1">
                <ActionRow
                  icon="create-outline"
                  label="Edit note"
                  description={
                    note ? "Update your personal note" : "Add a personal note"
                  }
                  onPress={() => setMode("note")}
                />
                <ActionRow
                  icon="share-outline"
                  label="Share bookmark"
                  description="Share the original link"
                  onPress={share}
                />
                <View className="my-1 h-px bg-border" />
                <ActionRow
                  icon="trash-outline"
                  label="Delete bookmark"
                  description="Permanently remove it from SaveIt"
                  destructive
                  onPress={remove}
                />
              </View>
            ) : (
              <View className="gap-4 pt-1">
                <View className="gap-2">
                  <Text className="font-sans-semibold text-[13px] text-muted-foreground">
                    Personal note
                  </Text>
                  <Input
                    autoFocus
                    value={draft}
                    onChangeText={(value) => {
                      setDraft(value);
                      if (error) setError(null);
                    }}
                    editable={!saving}
                    multiline
                    maxLength={2000}
                    numberOfLines={5}
                    textAlignVertical="top"
                    placeholder="Add context you want to remember…"
                    variant="filled"
                    className="min-h-[120px] rounded-2xl px-4 py-3"
                  />
                  <Text className="text-right font-sans text-[12px] text-muted-foreground">
                    {draft.length}/2000
                  </Text>
                  {error ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="font-sans text-[13px] text-destructive"
                    >
                      {error}
                    </Text>
                  ) : null}
                </View>
                <Button
                  loading={saving}
                  disabled={saving}
                  accessibilityLabel={saving ? "Saving note" : "Save note"}
                  className="rounded-2xl active:scale-[0.96]"
                  onPress={saveNote}
                >
                  Save note
                </Button>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
