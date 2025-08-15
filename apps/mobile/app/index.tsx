import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useShareIntent } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/contexts/AuthContext";

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
        
        if (!user) {
          console.log("🏠 Index - No user, redirecting to sign-in");
          router.replace("/sign-in");
        } else if (hasShareIntent || params.dataUrl) {
          console.log("🏠 Index - Redirecting to share-handler");
          router.replace("/share-handler");
        } else {
          console.log("🏠 Index - Redirecting to tabs");
          router.replace("/(tabs)");
        }
      };

      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [hasShareIntent, params.dataUrl, isNavigating, user, isLoading])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}