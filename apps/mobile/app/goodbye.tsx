import { CheckCircle } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Button, Text, YStack } from "tamagui";

import { useAuth } from "../src/contexts/AuthContext";

export default function GoodbyeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    // Auto sign out when this page loads (account was deleted)
    const autoSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error("Error signing out after account deletion:", error);
      }
    };

    autoSignOut();
  }, [signOut]);

  const goToHome = () => {
    router.replace("/");
  };

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$4"
      gap="$4"
      backgroundColor="$background"
    >
      <CheckCircle size={80} color="$green10" />
      
      <YStack alignItems="center" gap="$2">
        <Text fontSize="$8" fontWeight="bold" color="$color" textAlign="center">
          Account Deleted
        </Text>
        <Text fontSize="$5" color="$gray10" textAlign="center" lineHeight="$5">
          Your account has been successfully deleted.
        </Text>
      </YStack>

      <Text fontSize="$4" color="$gray10" textAlign="center" lineHeight="$5" maxWidth={300}>
        Thank you for using SaveIt.now. We&apos;re sorry to see you go.
        All your data has been permanently removed.
      </Text>

      <Button
        onPress={goToHome}
        size="$4"
        backgroundColor="$blue10"
        color="white"
        fontWeight="bold"
        marginTop="$4"
      >
        <Text color="white" fontSize="$4" fontWeight="bold">
          Continue
        </Text>
      </Button>
    </YStack>
  );
}