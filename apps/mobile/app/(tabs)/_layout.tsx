import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
  type VectorIconProps,
} from "expo-router/unstable-native-tabs";
import { useEffect } from "react";

import { LoadingScreen } from "../../src/components/ui/loading";
import { useAuth } from "../../src/contexts/AuthContext";
import { useThemeColors } from "../../src/lib/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;
const nativeTabIonicons: VectorIconProps<IoniconName>["family"] = Ionicons;

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const flowState = useQuery(
    api.users.queries.getOnboardingFlowState,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    if (flowState?.needsOnboarding) {
      router.replace("/welcome");
    }
  }, [flowState?.needsOnboarding, isAuthenticated, isLoading, router]);

  if (isLoading || (isAuthenticated && flowState === undefined)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || flowState?.needsOnboarding) {
    return <LoadingScreen />;
  }

  return (
    <NativeTabs
      tintColor={colors.foreground}
      labelStyle={{
        fontSize: 11,
        fontFamily: "DMSans_600SemiBold",
        fontWeight: "600",
      }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Bookmarks</Label>
        <Icon
          src={{
            default: (
              <VectorIcon family={nativeTabIonicons} name="bookmark-outline" />
            ),
            selected: <VectorIcon family={nativeTabIonicons} name="bookmark" />,
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Label>Chat</Label>
        <Icon
          src={{
            default: (
              <VectorIcon
                family={nativeTabIonicons}
                name="chatbubble-ellipses-outline"
              />
            ),
            selected: (
              <VectorIcon
                family={nativeTabIonicons}
                name="chatbubble-ellipses"
              />
            ),
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon
          src={{
            default: (
              <VectorIcon family={nativeTabIonicons} name="settings-outline" />
            ),
            selected: <VectorIcon family={nativeTabIonicons} name="settings" />,
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
