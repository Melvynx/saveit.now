import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardEvent,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { DuskButton } from "../components/dusk/dusk-button";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";
import { useAuth } from "../contexts/AuthContext";
import { duskColors } from "../lib/theme";

export type SignInStep = "email" | "otp";
export type AuthIntent = "signup" | "signin";

interface SignInScreenProps {
  intent?: AuthIntent;
  onClose?: () => void;
  onVerified?: () => void;
  closeOnVerified?: boolean;
  keyboardAvoidingEnabled?: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  otp: string;
  onOtpChange: (otp: string) => void;
  step: SignInStep;
  onStepChange: (step: SignInStep) => void;
}

export default function SignInScreen({
  intent = "signin",
  onClose,
  onVerified,
  closeOnVerified = true,
  keyboardAvoidingEnabled = true,
  email,
  onEmailChange,
  otp,
  onOtpChange,
  step,
  onStepChange,
}: SignInScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    "apple" | "google" | "github" | null
  >(null);
  const [observedKeyboardInset, setObservedKeyboardInset] = useState(0);
  const { sendOTP, verifyOTP, signInWithSocial, signInWithApple } = useAuth();
  const normalizedKeyboardBottomInset = Math.max(0, observedKeyboardInset);
  const hasExplicitKeyboardInset = normalizedKeyboardBottomInset > 0;
  const shouldUseIOSScrollInsets =
    Platform.OS === "ios" &&
    (keyboardAvoidingEnabled || hasExplicitKeyboardInset);
  const shouldUseKeyboardAvoidingView =
    keyboardAvoidingEnabled && Platform.OS !== "ios";
  const isSignup = intent === "signup";

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    try {
      await signInWithSocial(provider);
      onVerified?.();
      if (closeOnVerified) {
        onClose?.();
      }
    } catch {
      Alert.alert(
        "Sign in failed",
        `Could not sign in with ${
          provider === "google" ? "Google" : "GitHub"
        }. Please try again.`,
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading("apple");
    try {
      await signInWithApple();
    } catch {
      Alert.alert(
        "Sign in failed",
        "Could not sign in with Apple. Please try again.",
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSendOTP = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(normalizedEmail);
      onEmailChange(normalizedEmail);
      onOtpChange("");
      onStepChange("otp");
    } catch {
      Alert.alert(
        "Could not send code",
        "Check the email address and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), otp.trim());
      onVerified?.();
      if (closeOnVerified) {
        onClose?.();
      }
    } catch {
      Alert.alert(
        "Verification failed",
        "The code is invalid or expired. Request a new code and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    onStepChange("email");
    onOtpChange("");
  };

  useEffect(() => {
    if (keyboardAvoidingEnabled) {
      setObservedKeyboardInset(0);
      return;
    }

    const updateFromMetrics = () => {
      const metrics = Keyboard.metrics();
      setObservedKeyboardInset(metrics?.height ? metrics.height + 16 : 0);
    };
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setObservedKeyboardInset(event.endCoordinates.height + 16);
    };
    const handleKeyboardHide = () => {
      setObservedKeyboardInset(0);
    };

    updateFromMetrics();

    const subscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillShow", handleKeyboardShow),
            Keyboard.addListener("keyboardDidShow", handleKeyboardShow),
            Keyboard.addListener("keyboardWillHide", handleKeyboardHide),
            Keyboard.addListener("keyboardDidHide", handleKeyboardHide),
          ]
        : [
            Keyboard.addListener("keyboardDidShow", handleKeyboardShow),
            Keyboard.addListener("keyboardDidHide", handleKeyboardHide),
          ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [keyboardAvoidingEnabled]);

  return (
    <KeyboardAvoidingView
      enabled={shouldUseKeyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView
        className="flex-1 bg-dusk"
        contentContainerStyle={[
          styles.contentContainer,
          hasExplicitKeyboardInset
            ? {
                flexGrow: 0,
                paddingBottom: 32 + normalizedKeyboardBottomInset,
              }
            : null,
        ]}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={
          shouldUseIOSScrollInsets && !hasExplicitKeyboardInset
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View className="w-10" />
          <View className="h-[5px] w-10 rounded-full bg-white/15" />
          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sign-in"
              onPress={onClose}
              hitSlop={20}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Ionicons name="close" size={20} color={duskColors.foreground} />
              </View>
            </Pressable>
          ) : (
            <View className="w-10" />
          )}
        </View>

        {step === "otp" ? (
          <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
            <View className="gap-2">
              <Text className="font-serif text-[30px] leading-[36px] text-dusk-fg">
                Check your email
              </Text>
              <Text className="font-sans text-[15px] leading-[21px] text-dusk-muted">
                {"We sent a 6-digit code to "}
                <Text className="font-sans-semibold text-[15px] text-dusk-fg">
                  {email}
                </Text>
              </Text>
            </View>

            <View className="gap-3">
              <Input
                placeholder="000000"
                placeholderTextColor={duskColors.muted}
                selectionColor={duskColors.primary}
                keyboardAppearance="dark"
                value={otp}
                onChangeText={onOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                className="h-[56px] rounded-full border-white/10 bg-white/10 text-center font-sans-bold text-[24px] tracking-[8px] text-dusk-fg"
              />

              <DuskButton
                onPress={handleVerifyOTP}
                disabled={otp.length < 6}
                loading={isLoading}
              >
                {isLoading
                  ? "Verifying…"
                  : isSignup
                    ? "Create free account"
                    : "Sign in"}
              </DuskButton>

              <DuskButton variant="ghost" onPress={handleBackToEmail}>
                Use different email
              </DuskButton>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
            <View className="gap-2">
              <Text className="font-serif text-[30px] leading-[36px] text-dusk-fg">
                {isSignup ? (
                  <>
                    Give your links a{" "}
                    <Text className="font-serif-italic text-[30px] leading-[36px] text-dusk-primary">
                      home
                    </Text>
                    .
                  </>
                ) : (
                  <>
                    Welcome back{" "}
                    <Text className="font-serif-italic text-[30px] leading-[36px] text-dusk-primary">
                      home
                    </Text>
                    .
                  </>
                )}
              </Text>
              <Text className="font-sans text-[15px] leading-[21px] text-dusk-muted">
                {isSignup
                  ? "Start with 20 bookmarks, no credit card. We’ll email you a one-time code."
                  : "Sign in with a one-time email code or a connected account."}
              </Text>
            </View>

            <View className="gap-3">
              <Input
                placeholder="you@example.com"
                placeholderTextColor={duskColors.muted}
                selectionColor={duskColors.primary}
                keyboardAppearance="dark"
                value={email}
                onChangeText={onEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                autoFocus
                inputSize="pill"
                className="border-white/10 bg-white/10 text-dusk-fg"
              />

              <DuskButton
                onPress={handleSendOTP}
                disabled={!email.trim() || socialLoading !== null}
                loading={isLoading}
              >
                {isLoading
                  ? "Sending code…"
                  : isSignup
                    ? "Send me a sign-up code"
                    : "Send me a sign-in code"}
              </DuskButton>

              <View className="my-1 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-white/10" />
                <Text className="font-sans text-[12px] text-dusk-muted">
                  or
                </Text>
                <View className="h-px flex-1 bg-white/10" />
              </View>

              {Platform.OS === "ios" ? (
                <DuskButton
                  variant="white"
                  onPress={handleAppleSignIn}
                  loading={socialLoading === "apple"}
                  disabled={isLoading || socialLoading !== null}
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={19} color="#120a10" />
                  <Text className="font-sans-semibold text-[15px] text-dusk">
                    Continue with Apple
                  </Text>
                </DuskButton>
              ) : null}

              <DuskButton
                variant="glass"
                onPress={() => handleSocialSignIn("google")}
                loading={socialLoading === "google"}
                disabled={isLoading || socialLoading !== null}
                accessibilityLabel="Continue with Google"
              >
                <Ionicons
                  name="logo-google"
                  size={18}
                  color={duskColors.foreground}
                />
                <Text className="font-sans-semibold text-[15px] text-dusk-fg">
                  Continue with Google
                </Text>
              </DuskButton>

              <DuskButton
                variant="glass"
                onPress={() => handleSocialSignIn("github")}
                loading={socialLoading === "github"}
                disabled={isLoading || socialLoading !== null}
                accessibilityLabel="Continue with GitHub"
              >
                <Ionicons
                  name="logo-github"
                  size={18}
                  color={duskColors.foreground}
                />
                <Text className="font-sans-semibold text-[15px] text-dusk-fg">
                  Continue with GitHub
                </Text>
              </DuskButton>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
