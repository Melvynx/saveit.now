import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { TamaguiProvider, Theme } from "@tamagui/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShareIntentProvider } from "expo-share-intent";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments, usePathname, useGlobalSearchParams } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, createContext, useContext } from "react";
import "react-native-reanimated";

import { useColorScheme } from "../components/useColorScheme";
import { AuthProvider } from "../src/contexts/AuthContext";
import config from "../tamagui.config";

// Theme context for managing theme state across the app
const AppThemeContext = createContext<{
  currentTheme: 'light' | 'dark';
  toggleTheme: () => void;
}>({
  currentTheme: 'light',
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(AppThemeContext);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );
  
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
    <QueryClientProvider client={queryClient}>
      <ShareIntentProvider>
        <TamaguiProvider config={config}>
          <AppThemeContext.Provider value={{ currentTheme, toggleTheme }}>
            <Theme name={currentTheme}>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </Theme>
          </AppThemeContext.Provider>
        </TamaguiProvider>
      </ShareIntentProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { currentTheme } = useAppTheme();
  const segments = useSegments();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams();

  useEffect(() => {
    console.log("🚀 Navigation - Current pathname:", pathname);
    console.log("🚀 Navigation - Current segments:", segments);
    console.log("🚀 Navigation - Global params:", globalParams);
    console.log("🚀 Navigation - All search params:", JSON.stringify(globalParams));
  }, [pathname, segments, globalParams]);

  return (
    <ThemeProvider value={currentTheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen 
          name="bookmark/[id]" 
          options={{ 
            presentation: "modal",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="share-handler" 
          options={{ 
            presentation: "modal",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="bug-report-modal" 
          options={{ 
            presentation: "modal",
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="[...slug]" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
