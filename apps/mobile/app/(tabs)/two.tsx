import { LogOut, User } from "@tamagui/lucide-icons";
import { Alert } from "react-native";
import { Button, Card, Separator, Text, XStack, YStack } from "tamagui";

import { useAuth } from "../../src/contexts/AuthContext";

export default function TabTwoScreen() {
  const { user, signOut } = useAuth();

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
      <YStack alignItems="center" space="$4" marginTop="$8">
        <Text fontSize="$8" fontWeight="bold" color="$color">
          Settings
        </Text>
        <Separator width="80%" />
      </YStack>

      <Card
        padding="$4"
        space="$3"
        backgroundColor="$backgroundTransparent"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <XStack alignItems="center" space="$3">
          <User size={24} color="$gray10" />
          <YStack flex={1}>
            <Text fontSize="$3" color="$gray10">
              Signed in as:
            </Text>
            <Text fontSize="$5" fontWeight="500" color="$color">
              {user.email}
            </Text>
          </YStack>
        </XStack>
      </Card>

      <Button
        onPress={handleSignOut}
        theme="red"
        size="$4"
        backgroundColor="$red10"
        color="white"
        fontWeight="bold"
        marginTop="$6"
      >
        <LogOut size={20} />
        <Text color="white" fontSize="$4" fontWeight="bold">
          Sign Out
        </Text>
      </Button>
    </YStack>
  );
}
