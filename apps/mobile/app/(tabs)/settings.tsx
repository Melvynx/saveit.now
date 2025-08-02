import { Book, Bug, HelpCircle, LogOut, Moon, Sun, User } from "@tamagui/lucide-icons";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Alert } from "react-native";
import { Button, Card, Separator, Text, XStack, YStack } from "tamagui";

import { useAuth } from "../../src/contexts/AuthContext";
import { useAppTheme } from "../_layout";

export default function TabTwoScreen() {
  const { user, signOut } = useAuth();
  const { currentTheme, toggleTheme } = useAppTheme();

  const openDocumentation = async () => {
    await WebBrowser.openBrowserAsync("https://saveit.now/docs");
  };

  const openHelp = async () => {
    await WebBrowser.openBrowserAsync("https://saveit.now/help");
  };

  const openBugReport = () => {
    router.push("/bug-report-modal");
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
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
    <YStack flex={1} padding="$4" gap="$4">
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
      </YStack>

      <Button
        onPress={handleSignOut}
        theme="red"
        size="$4"
        backgroundColor="$red10"
        color="white"
        fontWeight="bold"
        marginTop="$4"
      >
        <LogOut size={20} />
        <Text color="white" fontSize="$4" fontWeight="bold">
          Sign Out
        </Text>
      </Button>
    </YStack>
  );
}
