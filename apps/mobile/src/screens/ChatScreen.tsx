import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Button, Input, Text, XStack, YStack } from "tamagui";
import { MessageList } from "../components/chat/MessageList";
import { useChat } from "../hooks/useChat";

export default function ChatScreen() {
  const [inputValue, setInputValue] = useState("");
  const { messages, status, sendMessage, stop } = useChat();

  const isGenerating = status === "loading" || status === "streaming";

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <YStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Text fontSize="$6" fontWeight="600">
            AI Chat
          </Text>
          <Text fontSize="$2" color="$gray10">
            Ask about your bookmarks
          </Text>
        </YStack>

        {/* Message Area */}
        <YStack flex={1}>
          <MessageList messages={messages} isLoading={isGenerating} />
        </YStack>

        {/* Input Area */}
        <YStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          <XStack gap="$2" alignItems="center">
            <Input
              flex={1}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Ask about your bookmarks..."
              onSubmitEditing={handleSend}
              editable={!isGenerating}
            />
            <Button
              size="$3"
              theme={isGenerating ? "red" : "blue"}
              onPress={isGenerating ? stop : handleSend}
              disabled={!isGenerating && !inputValue.trim()}
            >
              {isGenerating ? "Stop" : "Send"}
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
