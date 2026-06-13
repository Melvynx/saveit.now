import { api } from "@convex/_generated/api";
import Constants from "expo-constants";
import { useAction } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

import { Button } from "../src/components/ui/button";
import { IconButton } from "../src/components/ui/icon-button";
import { Input } from "../src/components/ui/input";
import { StatusScreen } from "../src/components/ui/status-screen";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";

export default function BugReportModal() {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const sendBugReport = useAction(api.users.actions.sendBugReport);

  const handleSubmitBugReport = async () => {
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert(
        "Error",
        "Please provide a detailed description (at least 10 characters)",
      );
      return;
    }

    if (!user) {
      Alert.alert("Error", "Please sign in to submit a bug report");
      return;
    }

    setIsLoading(true);
    try {
      const deviceInfo = `${Platform.OS} ${Platform.Version}`;
      const appVersion = Constants.expoConfig?.version || "Unknown";

      await sendBugReport({
        description: description.trim(),
        deviceInfo,
        appVersion,
      });

      Alert.alert(
        "Bug Report Sent",
        "Thank you for your feedback! We've received your bug report and will investigate it.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Error submitting bug report:", error);
      Alert.alert("Error", "Failed to submit bug report. Please try again.");
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
        icon="bug-outline"
        title="Sign In Required"
        message="Please sign in to submit a bug report"
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
              Report Bug
            </Text>
            <Text variant="subtitle">Help us improve the app</Text>
          </View>
          <IconButton icon="close" onPress={handleCancel} disabled={isLoading} />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="gap-6">
            <View className="rounded-2xl bg-secondary px-5 py-4">
              <Text className="font-sans text-[13px] text-muted-foreground">
                Reporting as
              </Text>
              <Text className="font-sans-medium text-[17px] text-foreground">
                {user.email}
              </Text>
            </View>

            <View className="gap-3">
              <View className="gap-1">
                <Text variant="label">{"What's the issue?"}</Text>
                <Text variant="body-sm" className="text-muted-foreground">
                  Please describe the bug in detail. Include steps to reproduce
                  if possible.
                </Text>
              </View>

              <Input
                placeholder="Describe the bug you encountered..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                variant="filled"
                className="min-h-[120px]"
              />

              <Text className="text-right font-sans text-[12px] text-muted-foreground">
                {description.length} characters (minimum 10)
              </Text>
            </View>

            <View className="gap-1 rounded-2xl border border-border bg-card px-5 py-4">
              <Text className="font-sans-semibold text-[14px] text-foreground">
                Device Information
              </Text>
              <Text className="font-sans text-[13px] text-muted-foreground">
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text className="font-sans text-[13px] text-muted-foreground">
                App Version: {Constants.expoConfig?.version || "Unknown"}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View className="pb-4 pt-4">
          <Button
            onPress={handleSubmitBugReport}
            disabled={description.trim().length < 10}
            loading={isLoading}
          >
            {isLoading ? "Sending..." : "Submit Bug Report"}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
