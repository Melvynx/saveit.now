import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Button, H2, Input, Text, YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const { sendOTP, verifyOTP } = useAuth();

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
      Alert.alert("Error", "Please enter the OTP code");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(email.trim(), otp.trim());
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error instanceof Error ? error.message : "Invalid OTP code",
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "otp" ? (
          <YStack flex={1} justifyContent="center" padding="$4" gap="$4">
            <YStack gap="$2" alignItems="center">
              <H2 textAlign="center">Verify Your Email</H2>
              <Text textAlign="center" color="$gray10">
                We sent a 6-digit code to {email}
              </Text>
            </YStack>

            <Input
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textAlign="center"
              fontSize="$6"
              size="$5"
            />

            <Button onPress={handleVerifyOTP} disabled={isLoading} theme="blue">
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>

            <Button variant="outlined" onPress={handleBackToEmail}>
              Use different email
            </Button>
          </YStack>
        ) : (
          <YStack flex={1} justifyContent="center" padding="$4" gap="$4">
            <YStack gap="$2" alignItems="center">
              <Image
                source={{ uri: "https://saveit.now/images/logo.png" }}
                style={{ width: 200, height: 80 }}
                resizeMode="contain"
              />
              <Text textAlign="center" color="$gray10">
                Enter your email to receive a verification code
              </Text>
            </YStack>

            <Input
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              size="$5"
            />

            <Button
              onPress={handleSendOTP}
              disabled={isLoading}
              size="$5"
              theme="blue"
            >
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </YStack>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
