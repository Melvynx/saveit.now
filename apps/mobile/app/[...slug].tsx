import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useShareIntentContext } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";

// Cette route capture TOUT ce qui n'existe pas (comme /dataUrl=saveitShareKey)
export default function CatchAllPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntentContext();

  console.log("🔥 CatchAll - All params:", params);
  console.log("🔥 CatchAll - hasShareIntent:", hasShareIntent);
  console.log("🔥 CatchAll - Slug array:", params.slug);
  console.log("🔥 CatchAll - Raw URL data:", JSON.stringify(params));

  useEffect(() => {
    // Si on détecte des données de partage ou une URL suspecte, rediriger
    if (hasShareIntent || params.slug?.toString().includes('dataUrl')) {
      console.log("🔥 CatchAll - Detected share data, redirecting to share-handler");
      router.replace("/share-handler");
    } else {
      console.log("🔥 CatchAll - No share data, redirecting to tabs");
      router.replace("/(tabs)");
    }
  }, [hasShareIntent, params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}