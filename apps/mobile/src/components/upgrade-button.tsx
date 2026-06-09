import { Crown } from "@tamagui/lucide-icons";
import { useAction } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert } from "react-native";
import { Button, Spinner, Text, XStack } from "tamagui";
import { api } from "@convex/_generated/api";

interface UpgradeButtonProps {
  annual?: boolean;
}

export function UpgradeButton({ annual = false }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = useAction(api.stripe.actions.createCheckout);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckout({
        plan: "pro",
        annual: annual ?? false,
        successUrl: "saveit://upgrade/success",
        cancelUrl: "saveit://upgrade?error=true",
      });

      if (!result?.url) {
        Alert.alert("Error", "Could not get checkout URL");
        return;
      }

      await WebBrowser.openBrowserAsync(result.url);
      // Convex query is reactive — plan updates automatically after webhook.
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onPress={handleUpgrade}
      disabled={isLoading}
      backgroundColor="$blue10"
      color="white"
      size="$4"
    >
      {isLoading ? (
        <Spinner color="white" size="small" />
      ) : (
        <XStack alignItems="center" gap="$2">
          <Crown size={18} color="white" />
          <Text color="white" fontWeight="bold">
            Upgrade to Pro {annual ? "(Yearly)" : ""}
          </Text>
        </XStack>
      )}
    </Button>
  );
}
