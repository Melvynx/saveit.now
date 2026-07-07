import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";

import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { Input } from "../src/components/ui/input";
import { StatusScreen } from "../src/components/ui/status-screen";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";

export default function AddBookmarkModal() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const createBookmark = useMutation(api.bookmarks.mutations.create);

  const handleAddBookmark = async () => {
    if (!url.trim()) {
      Alert.alert("Error", "Please enter a URL");
      return;
    }

    if (!user) {
      Alert.alert("Error", "Please sign in to add bookmarks");
      return;
    }

    setIsLoading(true);
    try {
      await createBookmark({ url: url.trim() });

      Alert.alert("Success", "Bookmark added successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      Alert.alert("Error", "Failed to add bookmark. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!user) {
    return (
      <StatusScreen
        title="Sign In Required"
        message="Please sign in to add bookmarks"
        footer={
          <Button onPress={handleCancel} variant="secondary" className="self-stretch">
            Close
          </Button>
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 bg-background px-4 pt-4">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text variant="title" className="text-[24px] leading-[30px]">
              Add Bookmark
            </Text>
            <Text variant="subtitle">Save a new link to your collection</Text>
          </View>
          <IconButton icon="close" onPress={handleCancel} />
        </View>

        <Input
          placeholder="Paste URL here..."
          value={url}
          onChangeText={setUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="url"
          autoFocus
          variant="filled"
          inputSize="lg"
        />

        <View className="mt-6 gap-3">
          <Button
            onPress={handleAddBookmark}
            disabled={!url.trim()}
            loading={isLoading}
          >
            {isLoading ? "Adding..." : "Add Bookmark"}
          </Button>
          <Button variant="ghost" onPress={handleCancel} disabled={isLoading}>
            <Text className="font-sans-semibold text-[15px] text-muted-foreground">
              Cancel
            </Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
