import { Button, Input, XStack } from "tamagui";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onStop,
  isGenerating,
  disabled,
}: ChatInputProps) {
  const handleSubmit = () => {
    if (!value.trim() || isGenerating) return;
    onSend();
  };

  return (
    <XStack gap="$2" alignItems="center">
      <Input
        flex={1}
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask about your bookmarks..."
        onSubmitEditing={handleSubmit}
        editable={!isGenerating && !disabled}
      />
      <Button
        size="$3"
        theme={isGenerating ? "red" : "blue"}
        onPress={isGenerating ? onStop : handleSubmit}
        disabled={!isGenerating && !value.trim()}
      >
        {isGenerating ? "Stop" : "Send"}
      </Button>
    </XStack>
  );
}
