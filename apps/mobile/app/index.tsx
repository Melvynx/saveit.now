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
<<<<<<< Updated upstream
=======
  console.log("🏠 Index - User:", user);
  console.log("🏠 Index - isLoading:", isLoading);
  console.log("🏠 Index - isNavigating:", isNavigating);
>>>>>>> Stashed changes

  useFocusEffect(
    useCallback(() => {
      if (isNavigating) return;
      
      const handleNavigation = () => {
<<<<<<< Updated upstream
        setIsNavigating(true);
        
=======
>>>>>>> Stashed changes
        // Si on a des données de partage, rediriger vers share-handler
        if (hasShareIntent || params.dataUrl) {
          console.log("🏠 Index - Redirecting to share-handler");
          setIsNavigating(true);
          router.replace("/share-handler");
<<<<<<< Updated upstream
        } else {
          // Sinon, aller vers les tabs normalement
          console.log("🏠 Index - Redirecting to tabs");
=======
        } else if (user) {
          // Si on est authentifié, aller vers les tabs
          console.log("🏠 Index - User authenticated, redirecting to tabs");
          setIsNavigating(true);
>>>>>>> Stashed changes
          router.replace("/(tabs)");
        } else {
          // Si on n'est pas authentifié, ne pas naviguer et laisser afficher SignInScreen
          console.log("🏠 Index - User not authenticated, showing SignInScreen");
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