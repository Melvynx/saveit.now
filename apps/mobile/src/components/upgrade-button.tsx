import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Text } from "react-native";

import { Button } from "./ui/button";
import { useThemeColors } from "../lib/theme";

interface UpgradeButtonProps {
  annual?: boolean;
}

export function UpgradeButton({ annual = false }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = useAction(api.stripe.actions.createCheckout);
  const colors = useThemeColors();

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
    <Button onPress={handleUpgrade} loading={isLoading}>
      {!isLoading ? (
        <>
          <Ionicons name="sparkles" size={17} color={colors.primaryForeground} />
          <Text className="font-sans-bold text-[17px] text-primary-foreground">
            Upgrade to Pro{annual ? " (Yearly)" : ""}
          </Text>
        </>
      ) : null}
    </Button>
  );
}
