import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";
import { useThemeColors } from "../lib/theme";
import { useAuth } from "../contexts/AuthContext";

export type SignInStep = "email" | "otp";

interface SignInScreenProps {
  onClose?: () => void;
  onVerified?: () => void;
  closeOnVerified?: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  otp: string;
  onOtpChange: (otp: string) => void;
  step: SignInStep;
  onStepChange: (step: SignInStep) => void;
}

export default function SignInScreen({
  onClose,
  onVerified,
  closeOnVerified = true,
  email,
  onEmailChange,
  otp,
  onOtpChange,
  step,
  onStepChange,
}: SignInScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "github" | null
  >(null);
  const { sendOTP, verifyOTP, signInWithSocial } = useAuth();
  const colors = useThemeColors();

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View className="flex-1 bg-background px-6 pt-3">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="w-10" />
          <View className="h-[5px] w-10 rounded-full bg-border" />
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={20}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Ionicons name="close" size={20} color={colors.foreground} />
              </View>
            </Pressable>
          ) : (
            <View className="w-10" />
          )}
        </View>

        {step === "otp" ? (
          <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
            <View className="gap-2">
              <Text variant="title" className="text-[26px] leading-[32px]">
                Check your email
              </Text>
              <Text variant="subtitle">
                {"We sent a 6-digit code to "}
                <Text className="font-sans-semibold text-[15px] text-foreground">
                  {email}
                </Text>
              </Text>
            </View>

            <View className="gap-3">
              <Input
                placeholder="000000"
                value={otp}
                onChangeText={onOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                variant="filled"
                className="h-[56px] rounded-full text-center font-sans-bold text-[24px] tracking-[8px]"
              />

              <Button
                onPress={handleVerifyOTP}
                disabled={otp.length < 6}
                loading={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <Button variant="ghost" onPress={handleBackToEmail}>
                <Text className="font-sans-semibold text-[15px] text-muted-foreground">
                  Use different email
                </Text>
              </Button>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
            <View className="gap-2">
              <Text variant="title" className="text-[26px] leading-[32px]">
                Sign in to SaveIt
              </Text>
              <Text variant="subtitle">
                {"Enter your email and we'll send you a verification code"}
              </Text>
            </View>

            <View className="gap-3">
              <Input
                placeholder="you@example.com"
                value={email}
                onChangeText={onEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                autoFocus
                variant="filled"
                inputSize="pill"
              />

              <Button
                onPress={handleSendOTP}
                disabled={!email.trim() || socialLoading !== null}
                loading={isLoading}
              >
                {isLoading ? "Sending..." : "Continue"}
              </Button>

              <View className="my-1 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text variant="caption" className="text-muted-foreground">
                  or
                </Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <Button
                variant="outline"
                onPress={() => handleSocialSignIn("google")}
                loading={socialLoading === "google"}
                disabled={isLoading || socialLoading !== null}
              >
                <Ionicons
                  name="logo-google"
                  size={18}
                  color={colors.foreground}
                />
                <Text className="font-sans-semibold text-[15px] text-foreground">
                  Continue with Google
                </Text>
              </Button>

              <Button
                variant="outline"
                onPress={() => handleSocialSignIn("github")}
                loading={socialLoading === "github"}
                disabled={isLoading || socialLoading !== null}
              >
                <Ionicons
                  name="logo-github"
                  size={18}
                  color={colors.foreground}
                />
                <Text className="font-sans-semibold text-[15px] text-foreground">
                  Continue with GitHub
                </Text>
              </Button>
            </View>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
