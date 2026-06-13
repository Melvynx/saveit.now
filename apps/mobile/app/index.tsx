import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import { useCallback, useState } from "react";
import { Modal, View } from "react-native";

import { LoadingScreen } from "../src/components/ui/loading";
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

  useFocusEffect(
    useCallback(() => {
      if (isLoading || !user || isNavigating) return;

      const handleNavigation = () => {
        if (hasShareIntent || params.dataUrl) {
          setIsNavigating(true);
          router.replace("/share-handler");
        } else {
          setIsNavigating(true);
          setShowSignIn(false);
          router.replace("/(tabs)");
        }
      };

      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [
      hasShareIntent,
      params.dataUrl,
      isNavigating,
      isLoading,
      user,
      router,
    ]),
  );

  // Show onboarding/sign-in when user is not authenticated
  if (!user && !isLoading) {
    return (
      <>
        <OnboardingScreen onSignIn={() => setShowSignIn(true)} />
        <Modal
          visible={showSignIn}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSignIn(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="h-[70%] overflow-hidden rounded-t-[28px] bg-background">
              <SignInScreen onClose={() => setShowSignIn(false)} />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <LoadingScreen />;
}
