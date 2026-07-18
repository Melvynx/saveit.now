import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { useShareIntentContext } from "expo-share-intent";
import { View, ActivityIndicator } from "react-native";

export default function CatchAllPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent, isReady } = useShareIntentContext();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;

    const slug = params.slug;
    const slugString = Array.isArray(slug)
      ? slug.join("/")
      : slug?.toString() || "";
    const hasShareDeepLink = hasShareIntent || slugString.includes("dataUrl");

    if (hasShareDeepLink) {
      hasNavigated.current = true;
      router.replace("/share-handler");
    } else if (isReady) {
      hasNavigated.current = true;
      // Let the root route make the canonical auth/onboarding decision.
      router.replace("/");
    }
  }, [hasShareIntent, isReady, params.slug, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
