import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { type ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlurHeaderScreen } from "../../src/components/ui/blur-header-screen";
import { Text } from "../../src/components/ui/text";
import { useAuth } from "../../src/contexts/AuthContext";
import { hapticSelection } from "../../src/lib/haptics";
import { useAppTheme, useThemeColors } from "../../src/lib/theme";

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  trailing?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  onPress?: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="section-label">{title}</Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  trailing,
  destructive = false,
  disabled = false,
  isFirst = false,
  onPress,
}: SettingsRowProps) {
  const colors = useThemeColors();
  const content = (
    <View
      className={[
        "flex-row items-center gap-3 px-4 py-3.5",
        isFirst ? "" : "border-t border-border",
      ].join(" ")}
    >
      <View
        className={[
          "h-9 w-9 items-center justify-center rounded-xl",
          destructive ? "bg-destructive/10" : "bg-secondary",
        ].join(" ")}
      >
        <Ionicons
          name={icon}
          size={17}
          color={destructive ? colors.destructive : colors.foreground}
        />
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          className={[
            "font-sans-medium text-[16px]",
            destructive ? "text-destructive" : "text-foreground",
          ].join(" ")}
        >
          {title}
        </Text>
        {description ? (
          <Text className="font-sans text-[13px] text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        trailing
      ) : onPress ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
          style={{ opacity: 0.7 }}
        />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      onPress={onPress}
      disabled={disabled}
      className={disabled ? "opacity-50" : "active:opacity-70"}
    >
      {content}
    </Pressable>
  );
}

export default function TabTwoScreen() {
  const { user } = useAuth();
  const { currentTheme, toggleTheme } = useAppTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const openUpgrade = async () => {
    hapticSelection();
    await WebBrowser.openBrowserAsync("https://saveit.now/upgrade");
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

  const toggleAppTheme = () => {
    hapticSelection();
    toggleTheme();
  };

  if (!user) {
    return (
      <BlurHeaderScreen title="Settings">
        <View className="items-center justify-center gap-2 px-4 py-24">
          <Text className="text-center font-sans-bold text-[20px] text-foreground">
            Sign in required
          </Text>
          <Text variant="subtitle" className="max-w-[260px] text-center">
            Please sign in to access settings.
          </Text>
        </View>
      </BlurHeaderScreen>
    );
  }

  return (
    <BlurHeaderScreen
      title="Settings"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 112,
      }}
    >
      <View className="gap-5">
        <Section title="SaveIt Pro">
          <SettingsRow
            isFirst
            icon="sparkles-outline"
            title="Upgrade to Pro"
            description="Go premium on saveit.now — unlimited bookmarks & more"
            onPress={openUpgrade}
          />
          <View className="border-t border-border px-4 py-3">
            <Text className="font-sans text-[13px] text-muted-foreground">
              Subscriptions are managed on the web. Open saveit.now/upgrade,
              sign in, and choose a plan — Pro then unlocks here automatically.
            </Text>
          </View>
        </Section>

        <Section title="Account">
          <SettingsRow
            isFirst
            icon="person-circle-outline"
            title="Account"
            description={
              user.email ?? "Email, name, and account controls"
            }
            onPress={() => router.push("/account")}
          />
        </Section>

        <Section title="Appearance">
          <SettingsRow
            isFirst
            icon={currentTheme === "dark" ? "moon-outline" : "sunny-outline"}
            title="Theme"
            description={currentTheme === "dark" ? "Dark mode" : "Light mode"}
            trailing={
              <Switch
                value={currentTheme === "dark"}
                onValueChange={toggleAppTheme}
                trackColor={{
                  false: colors.secondary,
                  true: colors.primary,
                }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.secondary}
              />
            }
          />
        </Section>

        <Section title="Support">
          <SettingsRow
            isFirst
            icon="book-outline"
            title="Documentation"
            description="Guides and API reference"
            onPress={openDocumentation}
          />
          <SettingsRow
            icon="help-circle-outline"
            title="Help"
            description="Get support"
            onPress={openHelp}
          />
          <SettingsRow
            icon="bug-outline"
            title="Report Bug"
            description="Tell us what went wrong"
            onPress={openBugReport}
          />
        </Section>
      </View>
    </BlurHeaderScreen>
  );
}
