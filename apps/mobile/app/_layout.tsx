import "react-native-reanimated";

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { ShareIntentProvider } from "expo-share-intent";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";

import "../global.css";
import { themeColors, useAppTheme } from "../src/lib/theme";
import { AuthProvider } from "../src/contexts/AuthContext";
import { authClient } from "../src/lib/auth-client";
import { mobileConfig } from "../src/lib/config";
import { useIapRecovery } from "../src/lib/hooks/use-iap-recovery";

// Convex client — singleton outside component to avoid re-creation on re-renders.
const convex = new ConvexReactClient(mobileConfig.convexUrl, {
  unsavedChangesWarning: false,
});

const shareIntentOptions = {
  resetOnBackground: false,
  scheme: "saveit",
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

// Keep the branded launch screen visible until fonts are ready, then fade it out.
SplashScreen.setOptions({ duration: 280, fade: true });
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <ShareIntentProvider options={shareIntentOptions}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ShareIntentProvider>
    </ConvexBetterAuthProvider>
  );
}

function RootLayoutNav() {
  useIapRecovery();

  const { currentTheme } = useAppTheme();
  const isDark = currentTheme === "dark";
  const colors = isDark ? themeColors.dark : themeColors.light;

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.card,
        text: colors.foreground,
        border: colors.border,
        primary: colors.primary,
      },
    }),
    [
      colors.background,
      colors.border,
      colors.card,
      colors.foreground,
      colors.primary,
      isDark,
    ],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="account"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="bookmark/[id]"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="share-handler"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="bug-report-modal"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen name="[...slug]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
