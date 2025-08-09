import {
  AlertDialog,
  Button,
  Card,
  H2,
  H3,
  Input,
  Paragraph,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "../src/contexts/AuthContext";
import { useRouter } from "expo-router";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWhyDialog, setShowWhyDialog] = useState(false);
  const { sendOTP, verifyOTP } = useAuth();
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(email);
      setIsOtpSent(true);
      Alert.alert("Success", "Check your email for the verification code");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send OTP"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(email, otp);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Invalid verification code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      await sendOTP(email);
      Alert.alert("Success", "New verification code sent to your email");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to resend OTP"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <YStack
        flex={1}
        backgroundColor="$background"
        padding="$4"
        justifyContent="center"
        alignItems="center"
        gap="$6"
      >
        <YStack alignItems="center" gap="$4">
          <H2 fontSize="$10" fontWeight="bold" color="$color">
            SaveIt
          </H2>
          <Text fontSize="$5" color="$gray10" textAlign="center">
            Sign in to sync your bookmarks
          </Text>
        </YStack>

        <Card
          padding="$4"
          width="100%"
          maxWidth={400}
          backgroundColor="$backgroundTransparent"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <YStack gap="$4">
            {!isOtpSent ? (
              <>
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray10">
                    Email Address
                  </Text>
                  <Input
                    size="$4"
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </YStack>

                <Button
                  size="$4"
                  theme="blue"
                  onPress={handleSendOTP}
                  disabled={isLoading || !email}
                  opacity={isLoading || !email ? 0.5 : 1}
                >
                  {isLoading ? (
                    <Spinner size="small" color="$color" />
                  ) : (
                    <>
                      <FontAwesome name="envelope" size={20} />
                      <Text>Send Verification Code</Text>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray10">
                    Verification Code
                  </Text>
                  <Text fontSize="$2" color="$gray9">
                    Sent to {email}
                  </Text>
                  <Input
                    size="$4"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    disabled={isLoading}
                  />
                </YStack>

                <Button
                  size="$4"
                  theme="blue"
                  onPress={handleVerifyOTP}
                  disabled={isLoading || !otp}
                  opacity={isLoading || !otp ? 0.5 : 1}
                >
                  {isLoading ? (
                    <Spinner size="small" color="$color" />
                  ) : (
                    <Text>Verify & Sign In</Text>
                  )}
                </Button>

                <XStack gap="$2" justifyContent="space-between">
                  <Button
                    size="$3"
                    variant="outlined"
                    onPress={() => {
                      setIsOtpSent(false);
                      setOtp("");
                    }}
                    disabled={isLoading}
                    flex={1}
                  >
                    <Text fontSize="$3">Change Email</Text>
                  </Button>
                  <Button
                    size="$3"
                    variant="outlined"
                    onPress={handleResendOTP}
                    disabled={isLoading}
                    flex={1}
                  >
                    <Text fontSize="$3">Resend Code</Text>
                  </Button>
                </XStack>
              </>
            )}
          </YStack>
        </Card>

        <Button
          size="$4"
          variant="outlined"
          backgroundColor="transparent"
          onPress={() => setShowWhyDialog(true)}
        >
          <FontAwesome name="question-circle" size={20} />
          <Text>Why do I need to sign in?</Text>
        </Button>

        <AlertDialog open={showWhyDialog} onOpenChange={setShowWhyDialog}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay
              key="overlay"
              animation="quick"
              opacity={0.5}
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
            <AlertDialog.Content
              bordered
              elevate
              key="content"
              animation={[
                "quick",
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
              enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
              exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
              x={0}
              scale={1}
              opacity={1}
              y={0}
              maxWidth={500}
              margin="$4"
            >
              <YStack gap="$3">
                <AlertDialog.Title>
                  <H3>About SaveIt Mobile</H3>
                </AlertDialog.Title>
                <AlertDialog.Description>
                  <YStack gap="$3">
                    <Paragraph>
                      SaveIt Mobile is a companion app that syncs with your SaveIt
                      account to access your bookmarks on the go.
                    </Paragraph>
                    <Paragraph>
                      To use this app, you need to sign in with the same email
                      address you use on the web version of SaveIt.
                    </Paragraph>
                    <Paragraph fontWeight="600">How to sign in:</Paragraph>
                    <YStack gap="$2" paddingLeft="$2">
                      <Text>• Enter your email address</Text>
                      <Text>• Check your email for a 6-digit code</Text>
                      <Text>• Enter the code to sign in</Text>
                    </YStack>
                    <Paragraph fontSize="$3" color="$gray10">
                      If you signed up with Google on the web, just use your Google
                      email address here.
                    </Paragraph>
                  </YStack>
                </AlertDialog.Description>

                <XStack gap="$3" justifyContent="flex-end">
                  <AlertDialog.Action asChild>
                    <Button theme="blue">Got it</Button>
                  </AlertDialog.Action>
                </XStack>
              </YStack>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </YStack>
    </KeyboardAvoidingView>
  );
}