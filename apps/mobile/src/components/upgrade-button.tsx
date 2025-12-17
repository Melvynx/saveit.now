import { Crown } from "@tamagui/lucide-icons";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert } from "react-native";
import { Button, Spinner, Text, XStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/api-client";
import { getServerUrl } from "../lib/server-url";

interface UpgradeButtonProps {
  annual?: boolean;
}

export function UpgradeButton({ annual = false }: UpgradeButtonProps) {
  const { refreshPlan } = useAuth();
  const [isOpening, setIsOpening] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const serverUrl = getServerUrl();
      const response = await apiClient.getCheckoutUrl({
        annual,
        successUrl: `${serverUrl}/upgrade/success`,
        cancelUrl: `${serverUrl}/upgrade?error=true`,
      });
      return response.checkoutUrl;
    },
    onSuccess: async (checkoutUrl) => {
      if (!checkoutUrl) {
        Alert.alert("Error", "Could not get checkout URL");
        return;
      }

      setIsOpening(true);
      try {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        refreshPlan();
      } finally {
        setIsOpening(false);
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to start checkout");
    },
  });

  const isLoading = checkoutMutation.isPending || isOpening;

  return (
    <Button
      onPress={() => checkoutMutation.mutate()}
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
