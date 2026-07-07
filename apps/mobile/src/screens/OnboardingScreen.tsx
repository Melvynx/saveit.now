import { Ionicons } from "@expo/vector-icons";
import { Image, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { useThemeColors } from "../lib/theme";
import onboardingLogo from "../../assets/images/splash-icon.png";

interface OnboardingScreenProps {
  onSignIn: () => void;
}

const features: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    icon: "bookmark-outline",
    title: "Save Anything",
    description: "Articles, videos, tweets - save any link instantly",
  },
  {
    icon: "sparkles-outline",
    title: "AI-Powered",
    description: "Auto-summarize and tag your bookmarks",
  },
  {
    icon: "search-outline",
    title: "Find Fast",
    description: "Search across all your saved content",
  },
  {
    icon: "globe-outline",
    title: "Access Anywhere",
    description: "Browser extension, mobile app, and web",
  },
];

export default function OnboardingScreen({ onSignIn }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-1 justify-center">
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          className="mb-10 items-center"
        >
          <Image
            source={onboardingLogo}
            className="mb-5 h-16 w-16 rounded-2xl"
            resizeMode="contain"
          />
          <Text
            variant="title"
            className="mb-2 text-center text-[32px] leading-[38px]"
          >
            SaveIt.now
          </Text>
          <Text variant="subtitle" className="max-w-[280px] text-center">
            Your personal bookmark manager with AI superpowers
          </Text>
        </Animated.View>

        <View className="gap-3">
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInDown.duration(400).delay(200 + index * 100)}
              className="flex-row items-center gap-4 rounded-2xl bg-secondary px-5 py-3.5"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-background">
                <Ionicons
                  name={feature.icon}
                  size={22}
                  color={colors.foreground}
                />
              </View>
              <View className="flex-1">
                <Text className="font-sans-bold text-[15px] text-foreground">
                  {feature.title}
                </Text>
                <Text className="font-sans text-[13px] text-muted-foreground">
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(650)}
        className="gap-3"
      >
        <Button onPress={onSignIn}>Sign In with Email</Button>
        <Text className="text-center font-sans text-[12px] text-muted-foreground">
          {"No password needed - we'll send you a code"}
        </Text>
      </Animated.View>
    </View>
  );
}
