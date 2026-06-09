import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { useShareIntentContext } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "../src/contexts/AuthContext";

export default function CatchAllPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntentContext();
  const { isAuthenticated } = useAuth();
  const hasNavigated = useRef(false);

  // Reactive plan query — updates automatically when Stripe webhook lands.
  const userLimits = useQuery(
    api.users.queries.getLimits,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (hasNavigated.current) return;

    const slugString = params.slug?.toString() || "";

    console.log("CatchAll - All params:", params);
    console.log("CatchAll - hasShareIntent:", hasShareIntent);
    console.log("CatchAll - Slug array:", params.slug);

    if (slugString.includes("upgrade/success")) {
      // Convex query is reactive — it will update when the Stripe webhook
      // fires the subscription mutation. Navigate once we have a pro plan,
      // or fall through after a short delay.
      console.log("CatchAll - Detected upgrade success, waiting for plan update");

      if (userLimits !== undefined) {
        hasNavigated.current = true;
        router.replace("/(tabs)/settings");
      }
      // If userLimits is still loading, this effect will re-run when it resolves.
      return;
    }

    if (hasShareIntent || slugString.includes("dataUrl")) {
      console.log("CatchAll - Detected share data, redirecting to share-handler");
      hasNavigated.current = true;
      router.replace("/share-handler");
    } else {
      console.log("CatchAll - No share data, redirecting to tabs");
      hasNavigated.current = true;
      router.replace("/(tabs)");
    }
  }, [hasShareIntent, params, router, userLimits, isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
