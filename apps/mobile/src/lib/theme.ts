import { useColorScheme } from "nativewind";
import { useColorScheme as useSystemColorScheme } from "react-native";

/**
 * Raw color values mirroring the CSS variables in global.css.
 * Use ONLY where className styling is impossible (tab bar, ActivityIndicator,
 * icon `color` props, navigation themes).
 */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  border: string;
  destructive: string;
  tabInactive: string;
};

export const themeColors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: "#FFFDF8",
    foreground: "#1F1308",
    card: "#FFFFFF",
    muted: "#F7F0E8",
    mutedForeground: "#7A6B5A",
    primary: "#EA6A12",
    primaryForeground: "#FFF8EC",
    secondary: "#F8EFE6",
    border: "#ECDCCD",
    destructive: "#EF4444",
    tabInactive: "#A08B78",
  },
  dark: {
    background: "#140F0A",
    foreground: "#FFF7ED",
    card: "#1D1711",
    muted: "#2A2118",
    mutedForeground: "#B79F89",
    primary: "#FB923C",
    primaryForeground: "#1C1007",
    secondary: "#251C14",
    border: "#3A2B1F",
    destructive: "#F87171",
    tabInactive: "#836B57",
  },
};

/**
 * Fixed "dusk" palette for marketing/auth surfaces (onboarding, sign-in,
 * welcome, paywall). Mirrors the web landing v2 theme — always dark,
 * independent of the user's color scheme. Use for icon/spinner `color`
 * props on those screens; className styling uses the `dusk-*` tokens.
 */
export const duskColors = {
  background: "#120a10",
  card: "#1a0e15",
  raised: "#251621",
  foreground: "#f7ede8",
  muted: "#a89099",
  cream: "#f3dfd6",
  peach: "#ffd9c2",
  primary: "#ff8f70",
  primaryForeground: "#23100a",
  border: "rgba(255, 255, 255, 0.09)",
  destructive: "#f87171",
} as const;

/**
 * Single source of truth for the active theme. NativeWind's colorScheme can be
 * null on the first frame — fall back to the system scheme so nav chrome
 * matches the media-query-driven CSS variables.
 */
export function useAppTheme() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const systemScheme = useSystemColorScheme();
  const currentTheme: "light" | "dark" =
    (colorScheme ?? systemScheme) === "dark" ? "dark" : "light";
  return { currentTheme, toggleTheme: toggleColorScheme };
}

export function useThemeColors(): ThemeColors & { isDark: boolean } {
  const { currentTheme } = useAppTheme();
  const isDark = currentTheme === "dark";
  return { ...(isDark ? themeColors.dark : themeColors.light), isDark };
}
