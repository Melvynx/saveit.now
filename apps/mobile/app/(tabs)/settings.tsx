import { Book, HelpCircle, LogOut, Moon, Sun, Trash2, User } from "@tamagui/lucide-icons";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";
import { AlertDialog, Button, Card, Separator, Text, XStack, YStack } from "tamagui";

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

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleDeleteAccountSteps = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to sign out");
    }
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

        <AlertDialog>
          <AlertDialog.Trigger asChild>
            <Button
              size="$4"
              backgroundColor="$backgroundTransparent"
              borderWidth={1}
              borderColor="$red8"
              justifyContent="flex-start"
            >
              <XStack alignItems="center" gap="$3">
                <Trash2 size={20} color="$red10" />
                <Text fontSize="$4" color="$red10">
                  Delete Account
                </Text>
              </XStack>
            </Button>
          </AlertDialog.Trigger>

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
            >
              <YStack gap="$3">
                <AlertDialog.Title fontSize="$6" fontWeight="bold">
                  Delete Account
                </AlertDialog.Title>
                <AlertDialog.Description fontSize="$4" color="$gray10" lineHeight="$5">
                  To delete your account, please follow these steps:
                </AlertDialog.Description>
                
                <YStack gap="$3" marginVertical="$2">
                  <XStack gap="$2" alignItems="flex-start">
                    <Text fontSize="$4" fontWeight="bold" color="$color" minWidth={20}>1.</Text>
                    <Text fontSize="$4" color="$color" flex={1}>
                      Go to{" "}
                      <Text 
                        fontSize="$4" 
                        color="$blue10" 
                        textDecorationLine="underline"
                        onPress={() => Linking.openURL("https://saveit.now/signin?redirectUrl=https://saveit.now/account")}
                      >
                        https://saveit.now/signin?redirectUrl=https://saveit.now/account
                      </Text>
                    </Text>
                  </XStack>
                  
                  <XStack gap="$2" alignItems="flex-start">
                    <Text fontSize="$4" fontWeight="bold" color="$color" minWidth={20}>2.</Text>
                    <Text fontSize="$4" color="$color" flex={1}>
                      Click on the delete account button
                    </Text>
                  </XStack>
                  
                  <XStack gap="$2" alignItems="flex-start">
                    <Text fontSize="$4" fontWeight="bold" color="$color" minWidth={20}>3.</Text>
                    <Text fontSize="$4" color="$color" flex={1}>
                      Click on the link in your email to confirm
                    </Text>
                  </XStack>
                </YStack>

                <Text fontSize="$3" color="$gray10" fontStyle="italic" marginTop="$2">
                  Then your account will be deleted. The app will show an unlogged state after you follow these steps.
                </Text>

                <XStack gap="$3" justifyContent="flex-end" marginTop="$4">
                  <AlertDialog.Cancel asChild>
                    <Button size="$3" variant="outlined">
                      <Text>Cancel</Text>
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button theme="red" size="$3" onPress={handleDeleteAccountSteps}>
                      <Text color="white">Got it</Text>
                    </Button>
                  </AlertDialog.Action>
                </XStack>
              </YStack>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
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
