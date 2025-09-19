import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  Adapt,
  Button,
  Dialog,
  H2,
  Input,
  Sheet,
  Text,
  Unspaced,
  X,
  YStack,
} from "tamagui";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
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
      // Modal will close automatically when auth context updates
      onOpenChange(false);
      // Reset state
      setEmail("");
      setOtp("");
      setStep("email");
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

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setEmail("");
    setOtp("");
    setStep("email");
  };

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <Adapt when="sm" platform="touch">
        <Sheet animation="medium" zIndex={200000} modal dismissOnSnapToBottom>
          <Sheet.Frame padding="$4" gap="$4">
            <Adapt.Contents />
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="slow"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={[
            'quicker',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          padding="$6"
          maxWidth={380}
          width="85%"
          maxHeight="60%"
        >
          <Dialog.Title asChild>
            <Text opacity={0} position="absolute">
              {step === "otp" ? "Verify Your Email" : "Sign In"}
            </Text>
          </Dialog.Title>

          <Dialog.Close asChild>
            <Unspaced>
              <Button
                position="absolute"
                top="$3"
                right="$3"
                size="$2"
                circular
                icon={X}
                onPress={handleClose}
              />
            </Unspaced>
          </Dialog.Close>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            >
              <YStack gap="$4" justifyContent="center" flex={1}>
                <H2 textAlign="center">
                  {step === "otp" ? "Verify Your Email" : "Sign In"}
                </H2>

                {step === "otp" ? (
                  <>
                    <Text textAlign="center" color="$gray10">
                      We sent a 6-digit code to {email}
                    </Text>

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
                      disabled={isLoading}
                      theme="blue"
                      size="$5"
                    >
                      {isLoading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <Button
                      variant="outlined"
                      onPress={handleBackToEmail}
                      size="$4"
                    >
                      Use different email
                    </Button>
                  </>
                ) : (
                  <>
                    <Text textAlign="center" color="$gray10" fontSize="$4">
                      Enter your email to receive a verification code
                    </Text>

                    <Input
                      placeholder="Email address"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      size="$5"
                      textAlign="center"
                    />

                    <Button
                      onPress={handleSendOTP}
                      disabled={isLoading}
                      size="$5"
                      theme="blue"
                    >
                      {isLoading ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </>
                )}
              </YStack>
            </ScrollView>
          </KeyboardAvoidingView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}