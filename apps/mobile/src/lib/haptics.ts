import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

/** Subtle tick for selections: filter pills, toggles, segmented controls. */
export function hapticSelection() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

/** Light tap for buttons and card actions. */
export function hapticLight() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirmation after a completed action (saved, sent). */
export function hapticSuccess() {
  if (enabled)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning before destructive flows (delete, sign out). */
export function hapticWarning() {
  if (enabled)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
