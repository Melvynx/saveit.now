import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { useThemeColors } from "../lib/theme";
import onboardingLogo from "../../assets/images/splash-icon.png";

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * Pre-auth onboarding. Two value-first slides that *show* the product's magic
 * (a link becoming an AI-enriched card, then a library that answers questions)
 * before ever asking the user to sign in.
 */
export default function OnboardingScreen({
  onGetStarted,
  onSignIn,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const slides = 2;
  const isLast = index === slides - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (isLast) {
      onGetStarted();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        <HookSlide width={width} />
        <PayoffSlide width={width} />
      </ScrollView>

      <View className="gap-4 px-6 pt-2">
        <View className="flex-row items-center justify-center gap-2">
          {Array.from({ length: slides }).map((_, i) => (
            <View
              key={i}
              className={
                i === index
                  ? "h-[6px] w-5 rounded-full bg-primary"
                  : "h-[6px] w-[6px] rounded-full bg-border"
              }
            />
          ))}
        </View>

        <Button onPress={goNext} className="active:scale-[0.96]">
          {isLast ? "Get started free" : "See how SaveIt works"}
        </Button>

        <Button
          variant="outline"
          onPress={onSignIn}
          className="active:scale-[0.96]"
        >
          Sign in
        </Button>
      </View>
    </View>
  );
}

function SlideShell({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-8">{children}</View>
    </ScrollView>
  );
}

function HookSlide({ width }: { width: number }) {
  return (
    <SlideShell width={width}>
      <Animated.View
        entering={FadeInDown.duration(400).delay(80)}
        className="gap-4"
      >
        <Image
          source={onboardingLogo}
          className="h-14 w-14 rounded-2xl"
          resizeMode="contain"
        />
        <Text variant="title" className="text-[32px] leading-[37px]">
          Save now.{"\n"}
          <Text
            variant="title"
            className="text-[32px] leading-[37px] text-primary"
          >
            Understand later.
          </Text>
        </Text>
        <Text variant="subtitle" className="max-w-[300px] text-[15px]">
          Paste any link. Our AI titles, summarizes and tags it — automatically.
        </Text>
      </Animated.View>

      <DemoCard />
    </SlideShell>
  );
}

/**
 * Self-animating demo: a raw URL visibly transforms into an enriched bookmark
 * card (title + AI summary + tags) — the "aha" before any ask.
 */
function DemoCard() {
  const colors = useThemeColors();
  const [enriched, setEnriched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnriched(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(260)}
      className="rounded-2xl border border-border bg-card p-4"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
      }}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="link" size={14} color={colors.mutedForeground} />
        <Text
          numberOfLines={1}
          className="flex-1 font-sans text-[12px] text-muted-foreground"
        >
          theverge.com/ai-agents-2026-guide
        </Text>
      </View>

      {!enriched ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text className="font-sans-semibold text-[12px] text-primary">
            AI is reading the page…
          </Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} className="mt-3 gap-2.5">
          <View className="h-20 items-start justify-start rounded-xl bg-primary/15 p-2">
            <View className="rounded-full bg-primary px-2 py-0.5">
              <Text className="font-sans-bold text-[9px] text-primary-foreground">
                ARTICLE
              </Text>
            </View>
          </View>
          <Text className="font-sans-bold text-[14px] text-foreground">
            The complete guide to AI agents in 2026
          </Text>
          <View className="flex-row items-start gap-1.5">
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text className="flex-1 font-sans text-[12px] text-muted-foreground">
              A tour of agent architectures, tool-use and the emerging
              multi-agent patterns.
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {["#AI", "#agents", "#to-read", "#dev"].map((tag) => (
              <View key={tag} className="rounded-full bg-secondary px-2.5 py-1">
                <Text className="font-sans-semibold text-[10.5px] text-foreground">
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function PayoffSlide({ width }: { width: number }) {
  const colors = useThemeColors();
  return (
    <SlideShell width={width}>
      <Animated.View
        entering={FadeInDown.duration(400).delay(80)}
        className="gap-4"
      >
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Ionicons
            name="chatbubbles-outline"
            size={26}
            color={colors.primary}
          />
        </View>
        <Text variant="title" className="text-[32px] leading-[37px]">
          Your memory,{"\n"}
          <Text
            variant="title"
            className="text-[32px] leading-[37px] text-primary"
          >
            that answers back.
          </Text>
        </Text>
        <Text variant="subtitle" className="max-w-[300px] text-[15px]">
          Ask a question in plain words. SaveIt searches everything you saved.
        </Text>
      </Animated.View>

      <View className="gap-2.5">
        <View className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5">
          <Text className="font-sans text-[13px] text-primary-foreground">
            What did I save about React 19?
          </Text>
        </View>
        <View className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2.5">
          <Text className="font-sans text-[13px] text-foreground">
            You have 3 resources: the official changelog, a thread on Server
            Components and a video about use().
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons
              name="documents-outline"
              size={12}
              color={colors.mutedForeground}
            />
            <Text className="font-sans-semibold text-[11px] text-muted-foreground">
              3 bookmarks · sources cited
            </Text>
          </View>
        </View>
      </View>
    </SlideShell>
  );
}
