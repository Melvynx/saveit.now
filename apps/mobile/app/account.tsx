import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlurHeaderScreen } from "../src/components/ui/blur-header-screen";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";
import { authClient } from "../src/lib/auth-client";
import { hapticSuccess, hapticWarning } from "../src/lib/haptics";
import { useThemeColors } from "../src/lib/theme";
import { cn } from "../src/lib/utils";

type AccountDetailRowProps = {
  label: string;
  value: string;
  action?: ReactNode;
  bordered?: boolean;
  mutedValue?: boolean;
  onPress?: () => void;
};

function AccountDetailRow({
  label,
  value,
  action,
  bordered = false,
  mutedValue = false,
  onPress,
}: AccountDetailRowProps) {
  const content = (
    <>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-sans text-[13px] text-muted-foreground">
          {label}
        </Text>
        {action}
      </View>
      <Text
        numberOfLines={1}
        className={cn(
          "font-sans-medium text-[17px]",
          mutedValue ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </Text>
    </>
  );

  const className = cn("px-5 py-4", bordered && "border-t border-border");

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        className={cn(className, "active:opacity-70")}
      >
        {content}
      </Pressable>
    );
  }

  return <View className={className}>{content}</View>;
}

function RowEditButton({
  label = "Edit",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="rounded-full bg-secondary px-3 py-1.5 active:opacity-70"
    >
      <Text className="font-sans-semibold text-[13px] text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

type EditFieldSheetProps = {
  visible: boolean;
  title: string;
  label: string;
  value: string;
  placeholder: string;
  saving: boolean;
  error: string | null;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  onClose: () => void;
  onErrorChange: (message: string | null) => void;
  onSubmit: (value: string) => Promise<void>;
};

function EditFieldSheet({
  visible,
  title,
  label,
  value,
  placeholder,
  saving,
  error,
  autoCapitalize = "none",
  keyboardType = "default",
  textContentType,
  onClose,
  onErrorChange,
  onSubmit,
}: EditFieldSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(value);
      onErrorChange(null);
    }
  }, [onErrorChange, value, visible]);

  const submit = async () => {
    await onSubmit(draft.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        <View style={styles.modalRoot}>
          <BlurView
            intensity={28}
            tint={colors.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View className="bg-black/10" style={StyleSheet.absoluteFill} />
          <Pressable
            accessibilityLabel={`Close ${title}`}
            accessibilityRole="button"
            disabled={saving}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            className="px-6 pt-4"
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
              {
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-sans-bold text-[20px] text-foreground">
                {title}
              </Text>
              <Button
                variant="secondary"
                size="icon"
                disabled={saving}
                accessibilityLabel="Close"
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.mutedForeground}
                />
              </Button>
            </View>

            <View className="gap-2">
              <Text className="font-sans-semibold text-[13px] text-muted-foreground">
                {label}
              </Text>
              <Input
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  if (error) onErrorChange(null);
                }}
                placeholder={placeholder}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                editable={!saving}
                keyboardType={keyboardType}
                maxLength={label === "Name" ? 64 : 120}
                textContentType={textContentType}
                returnKeyType="done"
                variant="filled"
                inputSize="lg"
                onSubmitEditing={submit}
              />
            </View>
            {error ? (
              <Text className="mt-2 font-sans text-[13px] text-destructive">
                {error}
              </Text>
            ) : null}

            <View className="mt-5">
              <Button
                loading={saving}
                disabled={saving}
                accessibilityLabel={saving ? `${title} saving` : title}
                onPress={submit}
                className="rounded-2xl"
              >
                {title}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
  },
});

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AccountScreen() {
  const { user, signOutWithNavigation } = useAuth();
  const session = authClient.useSession();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const currentName = user?.name?.trim() ?? "";
  const currentEmail = user?.email ?? "";

  const handleSubmitName = async (nextName: string) => {
    if (nameSaving) return;
    if (!nextName) {
      setNameError("Name is required.");
      return;
    }
    if (nextName === currentName) {
      setNameSheetOpen(false);
      return;
    }

    setNameSaving(true);
    setNameError(null);
    try {
      const result = await authClient.updateUser({ name: nextName });
      if (result.error) {
        throw new Error(result.error.message || "Failed to update name");
      }

      await session.refetch();
      hapticSuccess();
      setNameSheetOpen(false);
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : "Could not update name.",
      );
    } finally {
      setNameSaving(false);
    }
  };

  const handleSubmitEmail = async (nextEmail: string) => {
    if (emailSaving) return;
    if (!isValidEmail(nextEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (nextEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailSheetOpen(false);
      return;
    }

    setEmailSaving(true);
    setEmailError(null);
    try {
      const result = await authClient.changeEmail({
        newEmail: nextEmail,
        callbackURL: "/account",
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to change email");
      }

      hapticSuccess();
      setEmailSheetOpen(false);
      Alert.alert(
        "Check your email",
        "Open the verification link to confirm your new email address.",
      );
    } catch (error) {
      setEmailError(
        error instanceof Error ? error.message : "Could not change email.",
      );
    } finally {
      setEmailSaving(false);
    }
  };

  const signOut = () => {
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

  const sendDeletionEmail = async () => {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    try {
      const result = await authClient.deleteUser({
        callbackURL: "/goodbye",
      });
      if (result.error) {
        throw new Error(result.error.message || "Something went wrong");
      }

      hapticSuccess();
      Alert.alert(
        "Delete Account",
        "We've sent you an email with a confirmation link. Click it to permanently delete your account.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      console.error("Failed to delete account:", error);
      Alert.alert("Error", `Failed to delete account: ${message}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    hapticWarning();
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. We will send a confirmation link to your email before deleting anything.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          style: "destructive",
          onPress: sendDeletionEmail,
        },
      ],
    );
  };

  if (!user) {
    return (
      <BlurHeaderScreen
        title="Account"
        contentTopOffset={8}
        headerTopPadding={24}
        trailing={
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Close account"
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Button>
        }
      >
        <View className="items-center justify-center gap-2 px-4 py-24">
          <Text className="text-center font-sans-bold text-[20px] text-foreground">
            Sign in required
          </Text>
          <Text variant="subtitle" className="max-w-[260px] text-center">
            Please sign in to manage your account.
          </Text>
        </View>
      </BlurHeaderScreen>
    );
  }

  return (
    <>
      <BlurHeaderScreen
        title="Account"
        contentTopOffset={8}
        headerTopPadding={24}
        trailing={
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Close account"
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={18} color={colors.foreground} />
          </Button>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View className="flex-1 justify-between gap-10">
          <View className="px-6">
            <View className="overflow-hidden rounded-2xl border border-border bg-card">
              <AccountDetailRow
                label="Email"
                value={currentEmail || "-"}
                action={
                  <RowEditButton onPress={() => setEmailSheetOpen(true)} />
                }
              />
              <AccountDetailRow
                bordered
                label="Name"
                value={currentName || "not defined"}
                mutedValue={!currentName}
                action={
                  <RowEditButton onPress={() => setNameSheetOpen(true)} />
                }
              />
            </View>
          </View>

          <View className="px-6">
            <Button
              variant="secondary"
              onPress={signOut}
              className="h-auto items-center rounded-2xl py-4"
            >
              <Text className="font-sans-semibold text-[17px] text-destructive">
                Log Out
              </Text>
            </Button>
            <Button
              variant="ghost"
              loading={isDeletingAccount}
              disabled={isDeletingAccount}
              onPress={confirmDeleteAccount}
              className="mt-2 h-auto items-center rounded-2xl py-3"
            >
              <Text className="font-sans-semibold text-[17px] text-destructive">
                {isDeletingAccount ? "Sending email..." : "Delete account"}
              </Text>
            </Button>
          </View>
        </View>
      </BlurHeaderScreen>

      <EditFieldSheet
        visible={emailSheetOpen}
        title="Change email"
        label="Email"
        value={currentEmail}
        placeholder="Email address"
        saving={emailSaving}
        error={emailError}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        onClose={() => setEmailSheetOpen(false)}
        onErrorChange={setEmailError}
        onSubmit={handleSubmitEmail}
      />
      <EditFieldSheet
        visible={nameSheetOpen}
        title="Change name"
        label="Name"
        value={currentName}
        placeholder="Name"
        saving={nameSaving}
        error={nameError}
        autoCapitalize="words"
        textContentType="name"
        onClose={() => setNameSheetOpen(false)}
        onErrorChange={setNameError}
        onSubmit={handleSubmitName}
      />
    </>
  );
}
