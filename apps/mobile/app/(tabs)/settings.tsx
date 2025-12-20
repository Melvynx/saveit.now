import {
  Book,
  Bug,
  Check,
  Crown,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Trash2,
  User,
} from "@tamagui/lucide-icons";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Alert, ScrollView } from "react-native";
import { Button, Card, Separator, Text, XStack, YStack } from "tamagui";

import { UpgradeButton } from "../../src/components/upgrade-button";
import { useAuth } from "../../src/contexts/AuthContext";
import { authClient } from "../../src/lib/auth-client";
import { useAppTheme } from "../_layout";

export default function TabTwoScreen() {
  const { user, plan, signOutWithNavigation } = useAuth();
  const { currentTheme, toggleTheme } = useAppTheme();

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.deleteUser({
        callbackURL: "/goodbye",
      });
      if (result.data) {
        return result.data;
      }
      throw new Error(result.error?.message || "Something went wrong");
    },
    onSuccess: () => {
      Alert.alert(
        "Delete Account",
        "We've sent you an email with a confirmation link. Click on the link in your email to permanently delete your account. You will be signed out now.",
        [
          {
            text: "OK",
            onPress: async () => {
              try {
                // await signOut();
              } catch {
                Alert.alert("Error", "Failed to sign out");
              }
            },
          },
        ],
      );
    },
    onError: (error: Error) => {
      console.error("Failed to delete account:", error);
      Alert.alert("Error", `Failed to delete account: ${error.message}`);
    },
  });

  const openDocumentation = async () => {
    await WebBrowser.openBrowserAsync("https://saveit.now/docs");
  };

  const openHelp = async () => {
    await WebBrowser.openBrowserAsync("https://saveit.now/help");
  };

  const openBugReport = () => {
    router.push("/bug-report-modal");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutWithNavigation(() => {
              router.replace("/");
            });
          } catch (error) {
            console.error("Sign out failed:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        gap="$4"
      >
        <Text fontSize="$8" fontWeight="bold" color="$color">
          Settings
        </Text>
        <Text fontSize="$4" textAlign="center" color="$gray10">
          Please sign in to access settings.
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <YStack gap="$4">
        <YStack alignItems="center" gap="$4" marginTop="$8">
          <Text fontSize="$8" fontWeight="bold" color="$color">
            Settings
          </Text>
          <Separator width="80%" />
        </YStack>

        <Card
          padding="$4"
          gap="$3"
          backgroundColor="$backgroundTransparent"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" gap="$3">
            <User size={24} color="$gray10" />
            <YStack flex={1} gap="$1">
              <Text fontSize="$3" color="$gray10">
                Signed in as:
              </Text>
              <Text fontSize="$5" fontWeight="500" color="$color">
                {user.email}
              </Text>
            </YStack>
          </XStack>
        </Card>

        <Card
          padding="$4"
          gap="$3"
          backgroundColor="$backgroundTransparent"
          borderWidth={1}
          borderColor={plan.name === "pro" ? "$green8" : "$borderColor"}
        >
          <XStack alignItems="center" gap="$3">
            <Crown
              size={24}
              color={plan.name === "pro" ? "$green10" : "$gray10"}
            />
            <YStack flex={1} gap="$1">
              <Text fontSize="$3" color="$gray10">
                Current Plan
              </Text>
              <XStack alignItems="center" gap="$2">
                <Text fontSize="$5" fontWeight="500" color="$color">
                  {plan.name === "pro" ? "SaveIt.pro" : "Free"}
                </Text>
                {plan.name === "pro" && <Check size={16} color="$green10" />}
              </XStack>
            </YStack>
          </XStack>
          {plan.name === "free" && (
            <YStack gap="$2" marginTop="$2">
              <Text fontSize="$2" color="$gray10">
                {plan.limits.bookmarks} bookmarks limit
              </Text>
              <UpgradeButton />
            </YStack>
          )}
          {plan.name === "pro" && (
            <Text fontSize="$2" color="$green10" marginTop="$2">
              Unlimited bookmarks
            </Text>
          )}
        </Card>

        <Card
          padding="$4"
          backgroundColor="$backgroundTransparent"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$3">
              {currentTheme === "dark" ? (
                <Moon size={24} color="$gray10" />
              ) : (
                <Sun size={24} color="$gray10" />
              )}
              <YStack gap="$1">
                <Text fontSize="$4" fontWeight="500" color="$color">
                  Theme
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {currentTheme === "dark" ? "Dark mode" : "Light mode"}
                </Text>
              </YStack>
            </XStack>
            <Button
              onPress={toggleTheme}
              size="$3"
              variant="outlined"
              backgroundColor="transparent"
            >
              {currentTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </XStack>
        </Card>

        <YStack gap="$3">
          <Button
            onPress={openDocumentation}
            size="$4"
            backgroundColor="$backgroundTransparent"
            borderWidth={1}
            borderColor="$borderColor"
            justifyContent="flex-start"
          >
            <XStack alignItems="center" gap="$3">
              <Book size={20} color="$gray10" />
              <Text fontSize="$4" color="$color">
                Documentation
              </Text>
            </XStack>
          </Button>

          <Button
            onPress={openHelp}
            size="$4"
            backgroundColor="$backgroundTransparent"
            borderWidth={1}
            borderColor="$borderColor"
            justifyContent="flex-start"
          >
            <XStack alignItems="center" gap="$3">
              <HelpCircle size={20} color="$gray10" />
              <Text fontSize="$4" color="$color">
                Help
              </Text>
            </XStack>
          </Button>

          <Button
            onPress={openBugReport}
            size="$4"
            backgroundColor="$backgroundTransparent"
            borderWidth={1}
            borderColor="$borderColor"
            justifyContent="flex-start"
          >
            <XStack alignItems="center" gap="$3">
              <Bug size={20} color="$gray10" />
              <Text fontSize="$4" color="$color">
                Report Bug
              </Text>
            </XStack>
          </Button>

          <Button
            size="$4"
            backgroundColor="$backgroundTransparent"
            borderWidth={1}
            borderColor="$red8"
            justifyContent="flex-start"
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This action cannot be undone.\n\nWe will send you an email with a confirmation link that you must click to permanently delete your account.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Send Email",
                    style: "destructive",
                    onPress: () => deleteAccountMutation.mutate(),
                  },
                ],
              );
            }}
            opacity={deleteAccountMutation.isPending ? 0.5 : 1}
            disabled={deleteAccountMutation.isPending}
          >
            <XStack alignItems="center" gap="$3">
              <Trash2 size={20} color="$red10" />
              <Text fontSize="$4" color="$red10">
                {deleteAccountMutation.isPending
                  ? "Deleting..."
                  : "Delete Account"}
              </Text>
            </XStack>
          </Button>
        </YStack>

        <Button
          onPress={handleSignOut}
          size="$4"
          backgroundColor="$backgroundTransparent"
          borderWidth={1}
          borderColor="$red8"
          justifyContent="flex-start"
        >
          <XStack alignItems="center" gap="$3">
            <LogOut size={20} color="$red10" />
            <Text fontSize="$4" color="$red10">
              Sign Out
            </Text>
          </XStack>
        </Button>
      </YStack>
    </ScrollView>
  );
}
