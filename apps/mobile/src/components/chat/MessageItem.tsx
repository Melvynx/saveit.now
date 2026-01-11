import { memo } from "react";
import { Spinner, Text, XStack, YStack } from "tamagui";
import type { ChatMessage } from "../../hooks/useChat";

interface MessageItemProps {
  message: ChatMessage;
  isLast?: boolean;
  isLoading?: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  isLast,
  isLoading,
}: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <XStack
      justifyContent={isUser ? "flex-end" : "flex-start"}
      marginBottom="$2"
    >
      <YStack
        backgroundColor={isUser ? "$blue10" : "$gray4"}
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$4"
        maxWidth="80%"
      >
        <Text color={isUser ? "white" : "$gray12"} fontSize="$3">
          {message.content || "..."}
        </Text>
        {!isUser && isLast && isLoading && (
          <XStack marginTop="$1">
            <Spinner size="small" color="$gray10" />
          </XStack>
        )}
      </YStack>
    </XStack>
  );
});
