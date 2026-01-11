import { Text, YStack } from "tamagui";

export default function ChatScreen() {
  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      backgroundColor="$background"
    >
      <Text fontSize="$6" fontWeight="600">
        AI Chat
      </Text>
      <Text color="$gray10" marginTop="$2">
        Coming soon...
      </Text>
    </YStack>
  );
}
