import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Button, H2, Input, Text, YStack } from "tamagui";
import { useAuth } from "../contexts/auth-context";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const { sendOTP, verifyOTP, isSendingOTP, isVerifyingOTP } = useAuth();

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    try {
      await sendOTP(email.trim());
      setStep("otp");
      Alert.alert(
        "OTP Sent",
        "Please check your email for the verification code",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send OTP",
      );
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the OTP code");
      return;
    }

    try {
      await verifyOTP(email.trim(), otp.trim());
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error instanceof Error ? error.message : "Invalid OTP code",
      );
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
  };

  if (step === "otp") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack
            flex={1}
            justifyContent="center"
            padding="$4"
            gap="$4"
            backgroundColor="$background"
          >
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

            <Button
              onPress={handleVerifyOTP}
              disabled={isVerifyingOTP}
              size="$5"
              theme="blue"
            >
              {isVerifyingOTP ? "Verifying..." : "Verify Code"}
            </Button>

            <Button variant="outlined" onPress={handleBackToEmail} size="$4">
              Use different email
            </Button>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack
          flex={1}
          justifyContent="center"
          padding="$4"
          gap="$4"
          backgroundColor="$background"
        >
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
            disabled={isSendingOTP}
            size="$5"
            theme="blue"
          >
            {isSendingOTP ? "Sending..." : "Send Verification Code"}
          </Button>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
