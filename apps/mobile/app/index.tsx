import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useShareIntent } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";

export default function IndexPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntent();
  const [isNavigating, setIsNavigating] = useState(false);

  console.log("🏠 Index - Params:", params);
  console.log("🏠 Index - hasShareIntent:", hasShareIntent);

  useFocusEffect(
    useCallback(() => {
      if (isNavigating) return;
      
      const handleNavigation = () => {
        setIsNavigating(true);
        
        // Si on a des données de partage, rediriger vers share-handler
        if (hasShareIntent || params.dataUrl) {
          console.log("🏠 Index - Redirecting to share-handler");
          router.replace("/share-handler");
        } else {
          // Sinon, aller vers les tabs normalement
          console.log("🏠 Index - Redirecting to tabs");
          router.replace("/(tabs)");
        }
      };

      // Petit délai pour laisser le temps au Root Layout de se monter
      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [hasShareIntent, params.dataUrl, isNavigating])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}