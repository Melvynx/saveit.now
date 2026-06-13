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

interface SignInScreenProps {
  onClose?: () => void;
}

export default function SignInScreen({ onClose }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const { sendOTP, verifyOTP } = useAuth();
  const colors = useThemeColors();

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(email.trim());
      setStep("otp");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send OTP",
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
      await verifyOTP(email.trim(), otp.trim());
      onClose?.();
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error instanceof Error ? error.message : "Invalid code",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
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
                onChangeText={setOtp}
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
                onChangeText={setEmail}
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
                disabled={!email.trim()}
                loading={isLoading}
              >
                {isLoading ? "Sending..." : "Continue"}
              </Button>
            </View>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
