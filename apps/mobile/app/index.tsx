import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useCallback, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";

import { LoadingScreen } from "../src/components/ui/loading";
import { useAuth } from "../src/contexts/AuthContext";
import OnboardingScreen from "../src/screens/OnboardingScreen";
import SignInScreen, {
  type AuthIntent,
  type SignInStep,
} from "../src/screens/SignInScreen";

export default function IndexPage() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { hasShareIntent, isReady: isShareIntentReady } =
    useShareIntentContext();
  const { user, isLoading } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInOtp, setSignInOtp] = useState("");
  const [signInStep, setSignInStep] = useState<SignInStep>("email");
  const [authIntent, setAuthIntent] = useState<AuthIntent>("signup");

  const signInSheetHeight = windowHeight * 0.7;

  const closeSignIn = useCallback(() => {
    setShowSignIn(false);
    setSignInEmail("");
    setSignInOtp("");
    setSignInStep("email");
  }, []);

  const openAuth = useCallback((intent: AuthIntent) => {
    setAuthIntent(intent);
    setShowSignIn(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isLoading || isNavigating || !isShareIntentReady) return;

      const handleNavigation = () => {
        if (hasShareIntent || params.dataUrl) {
          setIsNavigating(true);
          router.replace("/share-handler");
        } else if (user) {
          setIsNavigating(true);
          setShowSignIn(false);
          router.replace(user.onboarding === false ? "/welcome" : "/(tabs)");
        }
      };

      const timer = setTimeout(handleNavigation, 100);
      return () => clearTimeout(timer);
    }, [
      hasShareIntent,
      isNavigating,
      isLoading,
      isShareIntentReady,
      params.dataUrl,
      router,
      user,
    ]),
  );

  // Show onboarding/sign-in when user is not authenticated
  if (!user && !isLoading) {
    return (
      <>
        <View
          className="flex-1"
          accessibilityElementsHidden={showSignIn}
          importantForAccessibility={
            showSignIn ? "no-hide-descendants" : "auto"
          }
        >
          <OnboardingScreen
            onGetStarted={() => openAuth("signup")}
            onSignIn={() => openAuth("signin")}
          />
        </View>
        <Modal
          visible={showSignIn}
          animationType="slide"
          transparent
          onRequestClose={closeSignIn}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View
              className="overflow-hidden rounded-t-[28px] bg-background"
              style={{
                height: signInSheetHeight,
              }}
            >
              <SignInScreen
                intent={authIntent}
                onClose={closeSignIn}
                keyboardAvoidingEnabled={false}
                email={signInEmail}
                onEmailChange={setSignInEmail}
                otp={signInOtp}
                onOtpChange={setSignInOtp}
                step={signInStep}
                onStepChange={setSignInStep}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return <LoadingScreen />;
}
