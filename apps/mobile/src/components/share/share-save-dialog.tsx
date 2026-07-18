import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  ShareIntentPayload,
  ShareIntentPayloadError,
} from "../../lib/share-intent-payload";
import type { SignInStep } from "../../screens/SignInScreen";
import SignInScreen from "../../screens/SignInScreen";
import { useThemeColors } from "../../lib/theme";
import { Button } from "../ui/button";
import { LoadingSpinner } from "../ui/loading";
import { Text } from "../ui/text";

export type ShareSaveError = {
  title: string;
  message: string;
  retryable: boolean;
};

type ShareSaveDialogProps = {
  title: string;
  message: string;
  headerStatus: "loading" | "auth" | "error";
  payload: ShareIntentPayload | null;
  activeError: ShareIntentPayloadError | ShareSaveError | null;
  needsAuth: boolean;
  email: string;
  otp: string;
  signInStep: SignInStep;
  onEmailChange: (email: string) => void;
  onOtpChange: (otp: string) => void;
  onSignInStepChange: (step: SignInStep) => void;
  saveError: ShareSaveError | null;
  onClose: () => void;
  onRetry: () => void;
};

function ShareDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 700;

  return (
    <View className="flex-1 justify-end bg-black/50 px-3">
      <Animated.View
        entering={FadeInDown.duration(240)}
        className="self-center overflow-hidden border border-border bg-background"
        style={{
          width: isWide ? Math.min(width - 64, 520) : "100%",
          maxHeight: height * 0.9,
          borderTopLeftRadius: isWide ? 28 : 30,
          borderTopRightRadius: isWide ? 28 : 30,
          borderBottomLeftRadius: isWide ? 28 : 0,
          borderBottomRightRadius: isWide ? 28 : 0,
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: "#000000",
          shadowOpacity: colors.isDark ? 0.45 : 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -8 },
          elevation: 18,
        }}
      >
        <View className="flex-row items-center justify-between px-5 pt-3">
          <View className="w-10" />
          <View className="h-[5px] w-10 rounded-full bg-border" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close share dialog"
            onPress={onClose}
            hitSlop={16}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Ionicons name="close" size={20} color={colors.foreground} />
            </View>
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

function HeaderBadge({ status }: { status: "loading" | "auth" | "error" }) {
  const colors = useThemeColors();
  const icon =
    status === "error"
      ? "alert-circle-outline"
      : status === "auth"
        ? "lock-closed-outline"
        : "bookmark-outline";
  const background =
    status === "error" ? `${colors.destructive}1A` : colors.secondary;
  const iconColor = status === "error" ? colors.destructive : colors.foreground;

  return (
    <View
      className="h-16 w-16 items-center justify-center rounded-2xl"
      style={{ backgroundColor: background }}
    >
      {status === "loading" ? (
        <LoadingSpinner color={colors.foreground} />
      ) : (
        <Ionicons name={icon} size={28} color={iconColor} />
      )}
    </View>
  );
}

function UrlPreview({ payload }: { payload: ShareIntentPayload }) {
  let host = payload.url;
  try {
    host = new URL(payload.url).hostname;
  } catch {
    // Keep the original URL if parsing ever fails before the backend check.
  }

  return (
    <View className="rounded-2xl border border-border bg-card px-4 py-3">
      <Text className="font-sans-semibold text-[14px] text-foreground">
        {payload.title || host}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 font-sans text-[13px] text-muted-foreground"
      >
        {payload.url}
      </Text>
    </View>
  );
}

function SignInPanel({
  email,
  otp,
  step,
  onEmailChange,
  onOtpChange,
  onStepChange,
  onClose,
}: {
  email: string;
  otp: string;
  step: SignInStep;
  onEmailChange: (email: string) => void;
  onOtpChange: (otp: string) => void;
  onStepChange: (step: SignInStep) => void;
  onClose: () => void;
}) {
  return (
    <View className="mt-4 h-[430px] overflow-hidden rounded-3xl border border-border">
      <SignInScreen
        onClose={onClose}
        closeOnVerified={false}
        onVerified={() => undefined}
        email={email}
        onEmailChange={onEmailChange}
        otp={otp}
        onOtpChange={onOtpChange}
        step={step}
        onStepChange={onStepChange}
      />
    </View>
  );
}

function ErrorBlock({
  error,
}: {
  error: ShareIntentPayloadError | ShareSaveError;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
    >
      <Text className="font-sans-semibold text-[14px] text-destructive">
        {error.title}
      </Text>
      <Text className="mt-1 font-sans text-[13px] leading-[19px] text-foreground">
        {error.message}
      </Text>
    </Animated.View>
  );
}

export function ShareSaveDialog({
  title,
  message,
  headerStatus,
  payload,
  activeError,
  needsAuth,
  email,
  otp,
  signInStep,
  onEmailChange,
  onOtpChange,
  onSignInStepChange,
  saveError,
  onClose,
  onRetry,
}: ShareSaveDialogProps) {
  const showFooter = activeError || needsAuth;
  const isRetryableError = Boolean(saveError?.retryable);

  return (
    <ShareDialog onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
      >
        <View className="items-center gap-3 pt-3">
          <HeaderBadge status={headerStatus} />
          <View className="items-center gap-2">
            <Text
              variant="title"
              className="text-center text-[25px] leading-[31px]"
            >
              {title}
            </Text>
            <Text variant="subtitle" className="max-w-[320px] text-center">
              {message}
            </Text>
          </View>
        </View>

        <View className="mt-5 gap-4">
          {payload ? <UrlPreview payload={payload} /> : null}
          {activeError ? <ErrorBlock error={activeError} /> : null}

          {needsAuth ? (
            <SignInPanel
              email={email}
              otp={otp}
              step={signInStep}
              onEmailChange={onEmailChange}
              onOtpChange={onOtpChange}
              onStepChange={onSignInStepChange}
              onClose={onClose}
            />
          ) : null}
        </View>
      </ScrollView>

      {showFooter ? (
        <View className="gap-2 px-5 pt-1">
          {isRetryableError ? (
            <Button onPress={onRetry}>Try Again</Button>
          ) : (
            <Button
              variant={activeError ? "secondary" : "ghost"}
              onPress={onClose}
              labelClassName={activeError ? undefined : "text-muted-foreground"}
            >
              {activeError ? "Close" : "Cancel"}
            </Button>
          )}
        </View>
      ) : null}
    </ShareDialog>
  );
}
