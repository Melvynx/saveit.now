import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Globe, Search, Sparkles } from "@tamagui/lucide-icons";
import { Image, useColorScheme } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";

interface OnboardingScreenProps {
  onSignIn: () => void;
}

const features = [
  {
    icon: Bookmark,
    title: "Save Anything",
    description: "Articles, videos, tweets - save any link instantly",
    color: "#f49f1e",
    bgColor: "rgba(244, 159, 30, 0.2)",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Auto-summarize and tag your bookmarks",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.2)",
  },
  {
    icon: Search,
    title: "Find Fast",
    description: "Search across all your saved content",
    color: "#06b6d4",
    bgColor: "rgba(6, 182, 212, 0.2)",
  },
  {
    icon: Globe,
    title: "Access Anywhere",
    description: "Browser extension, mobile app, and web",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.2)",
  },
];

export default function OnboardingScreen({ onSignIn }: OnboardingScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#1a1a2e", "#16213e", "#0f0f23"]
          : ["#fef7ed", "#fff1e6", "#ffe8d6"]
      }
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <YStack flex={1} padding="$5" paddingTop="$10">
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$6">
          <YStack alignItems="center" gap="$3">
            <Image
              source={{ uri: "https://saveit.now/images/logo.png" }}
              style={{ width: 180, height: 72 }}
              resizeMode="contain"
            />
            <Text
              fontSize="$5"
              color={isDark ? "#e0e0e0" : "#555555"}
              textAlign="center"
              maxWidth={280}
            >
              Your personal bookmark manager with AI superpowers
            </Text>
          </YStack>

          <YStack gap="$3" width="100%" maxWidth={340}>
            {features.map((feature, index) => (
              <XStack
                key={index}
                gap="$3"
                alignItems="center"
                backgroundColor={
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.95)"
                }
                padding="$3.5"
                borderRadius="$4"
                shadowColor={isDark ? "transparent" : "rgba(0,0,0,0.08)"}
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={1}
                shadowRadius={8}
                elevation={3}
              >
                <YStack
                  backgroundColor={feature.bgColor}
                  padding="$2.5"
                  borderRadius="$3"
                >
                  <feature.icon size={24} color={feature.color} />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text
                    fontWeight="700"
                    fontSize="$4"
                    color={isDark ? "#ffffff" : "#1a1a1a"}
                  >
                    {feature.title}
                  </Text>
                  <Text fontSize="$3" color={isDark ? "#a0a0a0" : "#666666"}>
                    {feature.description}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>

        <YStack gap="$3" paddingBottom="$6">
          <Button
            size="$5"
            backgroundColor="#f49f1e"
            pressStyle={{ backgroundColor: "#e08f15", scale: 0.98 }}
            animation="quick"
            onPress={onSignIn}
          >
            <Text color="#000000" fontWeight="700" fontSize="$5">
              Sign In with Email
            </Text>
          </Button>
          <Text
            fontSize="$2"
            color={isDark ? "#888888" : "#777777"}
            textAlign="center"
          >
            {"No password needed - we'll send you a code"}
          </Text>
        </YStack>
      </YStack>
    </LinearGradient>
  );
}
