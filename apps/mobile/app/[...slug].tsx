import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useShareIntentContext } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/contexts/AuthContext";

export default function CatchAllPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntentContext();
  const { refreshPlanWithRetry } = useAuth();

  console.log("🔥 CatchAll - All params:", params);
  console.log("🔥 CatchAll - hasShareIntent:", hasShareIntent);
  console.log("🔥 CatchAll - Slug array:", params.slug);
  console.log("🔥 CatchAll - Raw URL data:", JSON.stringify(params));

  useEffect(() => {
    const slugString = params.slug?.toString() || "";

    if (slugString.includes("upgrade/success")) {
      console.log("🔥 CatchAll - Detected upgrade success, refreshing plan");
      refreshPlanWithRetry("pro").then(() => {
        router.replace("/(tabs)/settings");
      });
      return;
    }

    if (hasShareIntent || slugString.includes("dataUrl")) {
      console.log(
        "🔥 CatchAll - Detected share data, redirecting to share-handler",
      );
      router.replace("/share-handler");
    } else {
      console.log("🔥 CatchAll - No share data, redirecting to tabs");
      router.replace("/(tabs)");
    }
  }, [hasShareIntent, params, refreshPlanWithRetry, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
