import { X } from "@tamagui/lucide-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useColorScheme,
} from "react-native";
import { Button, H3, Input, Text, XStack, YStack } from "tamagui";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
      <YStack
        flex={1}
        backgroundColor={isDark ? "#1a1a1a" : "#ffffff"}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        padding="$5"
        paddingTop="$3"
      >
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
        >
          <YStack width={40} />
          <YStack
            width={40}
            height={5}
            backgroundColor={isDark ? "#444" : "#ddd"}
            borderRadius={3}
          />
          {onClose ? (
            <Pressable onPress={onClose} hitSlop={20}>
              <YStack
                width={40}
                height={40}
                alignItems="center"
                justifyContent="center"
                borderRadius={20}
                backgroundColor={isDark ? "#333" : "#f0f0f0"}
              >
                <X size={20} color={isDark ? "#fff" : "#333"} />
              </YStack>
            </Pressable>
          ) : (
            <YStack width={40} />
          )}
        </XStack>

        <YStack flex={1} justifyContent="flex-start" gap="$5" paddingTop="$2">
          {step === "otp" ? (
            <>
              <YStack gap="$2">
                <H3 color={isDark ? "#ffffff" : "#1a1a1a"}>Check your email</H3>
                <Text color={isDark ? "#a0a0a0" : "#666666"}>
                  {"We sent a 6-digit code to "}
                  <Text fontWeight="600" color={isDark ? "#ffffff" : "#1a1a1a"}>
                    {email}
                  </Text>
                </Text>
              </YStack>

              <YStack gap="$4">
                <Input
                  placeholder="000000"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textAlign="center"
                  fontSize="$8"
                  letterSpacing={12}
                  size="$6"
                  autoFocus
                  backgroundColor={isDark ? "#2a2a2a" : "#f5f5f5"}
                  borderColor={isDark ? "#444" : "#e0e0e0"}
                  color={isDark ? "#ffffff" : "#1a1a1a"}
                />

                <Button
                  size="$5"
                  backgroundColor="#f49f1e"
                  pressStyle={{ backgroundColor: "#e08f15", scale: 0.98 }}
                  animation="quick"
                  onPress={handleVerifyOTP}
                  disabled={isLoading || otp.length < 6}
                  opacity={isLoading || otp.length < 6 ? 0.6 : 1}
                >
                  <Text color="#000000" fontWeight="700" fontSize="$5">
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Text>
                </Button>

                <Button
                  size="$4"
                  backgroundColor="transparent"
                  borderWidth={1}
                  borderColor={isDark ? "#444" : "#ddd"}
                  pressStyle={{ backgroundColor: isDark ? "#333" : "#f5f5f5" }}
                  onPress={handleBackToEmail}
                >
                  <Text color={isDark ? "#ffffff" : "#333"} fontWeight="600">
                    Use different email
                  </Text>
                </Button>
              </YStack>
            </>
          ) : (
            <>
              <YStack gap="$2">
                <H3 color={isDark ? "#ffffff" : "#1a1a1a"}>
                  Sign in to SaveIt
                </H3>
                <Text color={isDark ? "#a0a0a0" : "#666666"}>
                  {"Enter your email and we'll send you a verification code"}
                </Text>
              </YStack>

              <YStack gap="$4">
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  size="$5"
                  autoFocus
                  backgroundColor={isDark ? "#2a2a2a" : "#f5f5f5"}
                  borderColor={isDark ? "#444" : "#e0e0e0"}
                  color={isDark ? "#ffffff" : "#1a1a1a"}
                />

                <Button
                  size="$5"
                  backgroundColor="#f49f1e"
                  pressStyle={{ backgroundColor: "#e08f15", scale: 0.98 }}
                  animation="quick"
                  onPress={handleSendOTP}
                  disabled={isLoading || !email.trim()}
                  opacity={isLoading || !email.trim() ? 0.6 : 1}
                >
                  <Text color="#000000" fontWeight="700" fontSize="$5">
                    {isLoading ? "Sending..." : "Continue"}
                  </Text>
                </Button>
              </YStack>
            </>
          )}
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
