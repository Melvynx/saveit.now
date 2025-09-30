import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useShareIntent } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";
import { Text, YStack } from "tamagui";
import { useAuth } from "../src/contexts/AuthContext";
import SignInScreen from "../src/screens/SignInScreen";

export default function IndexPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntent();
  const { user, isLoading } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  console.log("🏠 Index - Params:", params);
  console.log("🏠 Index - hasShareIntent:", hasShareIntent);
  console.log("🏠 Index - User:", user);
  console.log("🏠 Index - isLoading:", isLoading);

  useFocusEffect(
    useCallback(() => {
      if (isNavigating || isLoading) return;

      const handleNavigation = () => {
        setIsNavigating(true);

        // Si on a des données de partage, rediriger vers share-handler
        if (hasShareIntent || params.dataUrl) {
          console.log("🏠 Index - Redirecting to share-handler");
          router.replace("/share-handler");
        } else if (user) {
          // Si on est authentifié, aller vers les tabs
          console.log("🏠 Index - User authenticated, redirecting to tabs");
          router.replace("/(tabs)");
        }
        // Si on n'est pas authentifié, on reste sur cette page et on affiche SignInScreen
      };

      // Petit délai pour laisser le temps au Root Layout de se monter
      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [hasShareIntent, params.dataUrl, isNavigating, isLoading, user, router]),
  );

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <ActivityIndicator size="large" />
        <Text fontSize="$6" marginTop="$4">
          Loading...
        </Text>
      </YStack>
    );
  }

  // Show sign in screen if not authenticated and not navigating
  if (!user && !isNavigating) {
    return <SignInScreen />;
  }

  // Show loading indicator while navigating
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
