import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useShareIntent } from "expo-share-intent";
import { View, ActivityIndicator, Modal, useColorScheme } from "react-native";
import { Text, YStack } from "tamagui";
import { useAuth } from "../src/contexts/AuthContext";
import OnboardingScreen from "../src/screens/OnboardingScreen";
import SignInScreen from "../src/screens/SignInScreen";

export default function IndexPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { hasShareIntent } = useShareIntent();
  const { user, isLoading } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useFocusEffect(
    useCallback(() => {
      if (isLoading) return;

      // Reset navigation state when user is logged out
      if (!user) {
        setIsNavigating(false);
        return;
      }

      if (isNavigating) return;

      const handleNavigation = () => {
        if (hasShareIntent || params.dataUrl) {
          setIsNavigating(true);
          router.replace("/share-handler");
        } else if (user) {
          setIsNavigating(true);
          setShowSignIn(false);
          router.replace("/(tabs)");
        }
      };

      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [hasShareIntent, params.dataUrl, isNavigating, isLoading, user, router]),
  );

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

  if (!user && !isNavigating) {
    return (
      <>
        <OnboardingScreen onSignIn={() => setShowSignIn(true)} />
        <Modal
          visible={showSignIn}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSignIn(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                height: "70%",
                backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              <SignInScreen onClose={() => setShowSignIn(false)} />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
