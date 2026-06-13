import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UpgradeButton } from "../../src/components/upgrade-button";
import { Text } from "../../src/components/ui/text";
import { useAuth } from "../../src/contexts/AuthContext";
import { authClient } from "../../src/lib/auth-client";
import { hapticSelection, hapticWarning } from "../../src/lib/haptics";
import { useAppTheme, useThemeColors } from "../../src/lib/theme";

function SettingsRow({
  icon,
  title,
  description,
  trailing,
  showChevron = false,
  isFirst = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  isFirst?: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const row = (
    <View
      className={
        isFirst
          ? "flex-row items-center gap-3 px-4 py-3.5"
          : "flex-row items-center gap-3 border-t border-border px-4 py-3.5"
      }
    >
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-background">
        <Ionicons name={icon} size={16} color={colors.foreground} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-[16px] text-foreground">{title}</Text>
        {description ? (
          <Text className="font-sans text-[13px] text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
          style={{ opacity: 0.6 }}
        />
      ) : null}
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {row}
    </Pressable>
  );
}

export default function TabTwoScreen() {
  const { user, plan, signOutWithNavigation } = useAuth();
  const { currentTheme, toggleTheme } = useAppTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await authClient.deleteUser({
        callbackURL: "/goodbye",
      });
      if (result.data) {
        Alert.alert(
          "Delete Account",
          "We've sent you an email with a confirmation link. Click on the link in your email to permanently delete your account. You will be signed out now.",
          [{ text: "OK" }],
        );
      } else {
        throw new Error(result.error?.message || "Something went wrong");
      }
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      Alert.alert("Error", `Failed to delete account: ${error.message}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

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
    hapticWarning();
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
      <View
        className="flex-1 items-center justify-center gap-2 bg-background px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text variant="title">Settings</Text>
        <Text variant="subtitle" className="text-center">
          Please sign in to access settings.
        </Text>
      </View>
    );
  }

  const isPro = plan.name === "pro";

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="mb-6 px-4 pt-2">
        <Text variant="title">Settings</Text>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        <View className="mb-8 px-4">
          <Text variant="section-label" className="mb-3">
            Account
          </Text>
          <View className="rounded-2xl bg-secondary">
            <View className="px-5 py-4">
              <Text className="font-sans text-[13px] text-muted-foreground">
                Email
              </Text>
              <Text className="font-sans-medium text-[17px] text-foreground">
                {user.email}
              </Text>
            </View>
            <View className="border-t border-border px-5 py-4">
              <Text className="font-sans text-[13px] text-muted-foreground">
                Plan
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="font-sans-medium text-[17px] text-foreground">
                  {isPro ? "SaveIt Pro" : "Free"}
                </Text>
                {isPro ? (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                ) : null}
              </View>
              <Text className="mt-0.5 font-sans text-[13px] text-muted-foreground">
                {isPro
                  ? "Unlimited bookmarks"
                  : `${plan.limits.bookmarks} bookmarks limit`}
              </Text>
            </View>
          </View>
          {!isPro ? (
            <View className="mt-3">
              <UpgradeButton />
            </View>
          ) : null}
        </View>

        <View className="mb-8 px-4">
          <Text variant="section-label" className="mb-3">
            Appearance
          </Text>
          <View className="overflow-hidden rounded-2xl bg-secondary">
            <SettingsRow
              isFirst
              icon={currentTheme === "dark" ? "moon-outline" : "sunny-outline"}
              title="Theme"
              description={currentTheme === "dark" ? "Dark mode" : "Light mode"}
              trailing={
                <Pressable
                  onPress={() => {
                    hapticSelection();
                    toggleTheme();
                  }}
                  className="h-9 w-9 items-center justify-center rounded-full bg-background active:opacity-70"
                >
                  <Ionicons
                    name={currentTheme === "dark" ? "sunny-outline" : "moon-outline"}
                    size={16}
                    color={colors.foreground}
                  />
                </Pressable>
              }
            />
          </View>
        </View>

        <View className="mb-8 px-4">
          <Text variant="section-label" className="mb-3">
            App
          </Text>
          <View className="overflow-hidden rounded-2xl bg-secondary">
            <SettingsRow
              isFirst
              icon="book-outline"
              title="Documentation"
              description="Learn how to use SaveIt"
              showChevron
              onPress={openDocumentation}
            />
            <SettingsRow
              icon="help-circle-outline"
              title="Help"
              description="Get support"
              showChevron
              onPress={openHelp}
            />
            <SettingsRow
              icon="bug-outline"
              title="Report Bug"
              description="Tell us what went wrong"
              showChevron
              onPress={openBugReport}
            />
          </View>
        </View>

        <View className="gap-2.5 px-4">
          <Pressable
            onPress={handleSignOut}
            className="items-center rounded-2xl bg-secondary py-4 active:opacity-70"
          >
            <Text className="font-sans-semibold text-[17px] text-destructive">
              Log Out
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This action cannot be undone.\n\nWe will send you an email with a confirmation link that you must click to permanently delete your account.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Send Email",
                    style: "destructive",
                    onPress: handleDeleteAccount,
                  },
                ],
              );
            }}
            disabled={isDeletingAccount}
            className="items-center rounded-2xl border border-border py-4 active:opacity-70 disabled:opacity-50"
          >
            <Text className="font-sans-medium text-[15px] text-muted-foreground">
              {isDeletingAccount ? "Sending email..." : "Delete account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
