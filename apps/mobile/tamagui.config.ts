import { config } from "@tamagui/config/v3";
import { createTamagui } from "@tamagui/core";

// Custom color scheme based on frontend globals.css
const customColors = {
  light: {
    background: "#ffffff",
    foreground: "#454545",
    primary: "#f49f1e",
    primaryForeground: "#000000",
    secondary: "#f7f7f7",
    secondaryForeground: "#4b5666",
    muted: "#fafafa",
    mutedForeground: "#6c727e",
    accent: "#fffced",
    accentForeground: "#8f4113",
    border: "#e4e8ef",
    card: "#ffffff",
    cardForeground: "#454545",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    ring: "#f49f1e",
  },
  dark: {
    background: "#333333",
    foreground: "#ebebeb",
    primary: "#f49f1e",
    primaryForeground: "#000000",
    secondary: "#454545",
    secondaryForeground: "#ebebeb",
    muted: "#454545",
    mutedForeground: "#b8b8b8",
    accent: "#8f4113",
    accentForeground: "#fde484",
    border: "#5e5e5e",
    card: "#454545",
    cardForeground: "#ebebeb",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    ring: "#f49f1e",
  },
};

// Create custom themes using the same structure as default config
const customThemes = {
  light: {
    ...config.themes.light,
    background: customColors.light.background,
    backgroundHover: customColors.light.secondary,
    backgroundPress: customColors.light.muted,
    backgroundFocus: customColors.light.accent,
    backgroundStrong: customColors.light.foreground,
    backgroundTransparent: "rgba(255, 255, 255, 0.8)",
    color: customColors.light.foreground,
    colorHover: customColors.light.primaryForeground,
    colorPress: customColors.light.secondaryForeground,
    colorFocus: customColors.light.accentForeground,
    colorTransparent: "rgba(69, 69, 69, 0.8)",
    borderColor: customColors.light.border,
    borderColorHover: customColors.light.primary,
    borderColorFocus: customColors.light.ring,
    borderColorPress: customColors.light.accentForeground,
    placeholderColor: customColors.light.mutedForeground,
    outlineColor: customColors.light.ring,
  },
  dark: {
    ...config.themes.dark,
    background: customColors.dark.background,
    backgroundHover: customColors.dark.secondary,
    backgroundPress: customColors.dark.muted,
    backgroundFocus: customColors.dark.accent,
    backgroundStrong: customColors.dark.foreground,
    backgroundTransparent: "rgba(51, 51, 51, 0.8)",
    color: customColors.dark.foreground,
    colorHover: customColors.dark.primaryForeground,
    colorPress: customColors.dark.secondaryForeground,
    colorFocus: customColors.dark.accentForeground,
    colorTransparent: "rgba(235, 235, 235, 0.8)",
    borderColor: customColors.dark.border,
    borderColorHover: customColors.dark.primary,
    borderColorFocus: customColors.dark.ring,
    borderColorPress: customColors.dark.accentForeground,
    placeholderColor: customColors.dark.mutedForeground,
    outlineColor: customColors.dark.ring,
  },
};

// Merge custom themes with default config

const appConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    ...customThemes,
  },
} as const);

export default appConfig;

export type Conf = typeof appConfig;

declare module "@tamagui/core" {
  interface TamaguiCustomConfig extends Conf {}
}
