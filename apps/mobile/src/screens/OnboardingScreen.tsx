import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import heroScene from "../../assets/images/landing/home.webp";
import { DuskButton } from "../components/dusk/dusk-button";
import { DuskScene } from "../components/dusk/scene";
import { DuskWordmark } from "../components/dusk/wordmark";
import { Text } from "../components/ui/text";
import { duskColors } from "../lib/theme";

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

/**
 * Pre-auth onboarding in the landing "dusk" theme. Slide 1 is the brand hero
 * (the glowing house from the web landing); slide 2 shows the product's magic
 * (a link becoming an AI-enriched card, a library that answers back) before
 * ever asking the user to sign in.
 */
export default function OnboardingScreen({
  onGetStarted,
  onSignIn,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
      className="flex-1 bg-dusk"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        <HeroSlide width={width} height={height} />
        <PayoffSlide width={width} />
      </ScrollView>

      <View className="gap-4 px-6 pt-3">
        <View className="flex-row items-center justify-center gap-2">
          {Array.from({ length: slides }).map((_, i) => (
            <View
              key={i}
              className={
                i === index
                  ? "h-[6px] w-5 rounded-full bg-dusk-primary"
                  : "h-[6px] w-[6px] rounded-full bg-white/20"
              }
            />
          ))}
        </View>

        <DuskButton variant="white" onPress={goNext}>
          {isLast ? "Start saving free" : "See how SaveIt works"}
        </DuskButton>

        <DuskButton variant="glass" onPress={onSignIn}>
          Sign in
        </DuskButton>

        <Text className="text-center font-sans text-[12px] text-dusk-muted">
          Free forever · 20 bookmarks · No credit card
        </Text>
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
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-6">{children}</View>
    </ScrollView>
  );
}

function HeroSlide({ width, height }: { width: number; height: number }) {
  const heroHeight = Math.min(Math.max(height * 0.42, 260), 430);

  return (
    <SlideShell width={width}>
      <Animated.View entering={FadeIn.duration(500)}>
        <DuskScene
          source={heroScene}
          imagePosition={{ top: "30%", left: "50%" }}
          style={{ height: heroHeight }}
          className="justify-between p-5"
        >
          <DuskWordmark size={22} overImage />
          <Text className="font-sans-medium text-[13px] tracking-wide text-dusk-peach">
            Agentic bookmarks · Web + iOS
          </Text>
        </DuskScene>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(120)}
        className="gap-4"
      >
        <Text className="font-serif text-[40px] leading-[46px] text-dusk-fg">
          A home for everything{" "}
          <Text className="font-serif-italic text-[40px] leading-[46px] text-dusk-fg">
            you save.
          </Text>
        </Text>
        <Text className="max-w-[320px] font-sans text-[15px] leading-[22px] text-dusk-muted">
          One tap to save any link. An AI agent reads it, files it, and hands
          it back the moment you ask.
        </Text>
      </Animated.View>
    </SlideShell>
  );
}

function PayoffSlide({ width }: { width: number }) {
  return (
    <SlideShell width={width}>
      <Animated.View
        entering={FadeInDown.duration(400).delay(80)}
        className="gap-4"
      >
        <Text className="font-serif text-[36px] leading-[42px] text-dusk-fg">
          Your memory,{"\n"}
          <Text className="font-serif-italic text-[36px] leading-[42px] text-dusk-primary">
            that answers back.
          </Text>
        </Text>
        <Text className="max-w-[310px] font-sans text-[15px] leading-[22px] text-dusk-muted">
          Paste any link, then ask in plain words. SaveIt reads everything you
          saved and answers with sources.
        </Text>
      </Animated.View>

      <DemoCard />

      <Animated.View
        entering={FadeInDown.duration(400).delay(320)}
        className="gap-2.5"
      >
        <View className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-dusk-primary px-3.5 py-2.5">
          <Text className="font-sans text-[13px] text-dusk-primary-fg">
            What did I save about React 19?
          </Text>
        </View>
        <View className="max-w-[88%] self-start rounded-2xl rounded-bl-md bg-dusk-raised px-3.5 py-2.5">
          <Text className="font-sans text-[13px] text-dusk-fg">
            You have 3 resources: the official changelog, a thread on Server
            Components and a video about use().
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons
              name="documents-outline"
              size={12}
              color={duskColors.muted}
            />
            <Text className="font-sans-semibold text-[11px] text-dusk-muted">
              3 bookmarks · sources cited
            </Text>
          </View>
        </View>
      </Animated.View>
    </SlideShell>
  );
}

/**
 * Self-animating demo: a raw URL visibly transforms into an enriched bookmark
 * card (title + AI summary + tags) — the "aha" before any ask.
 */
function DemoCard() {
  const [enriched, setEnriched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnriched(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      className="rounded-2xl border border-white/10 bg-dusk-card p-4"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="link" size={14} color={duskColors.muted} />
        <Text
          numberOfLines={1}
          className="flex-1 font-sans text-[12px] text-dusk-muted"
        >
          theverge.com/ai-agents-2026-guide
        </Text>
      </View>

      {!enriched ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator size="small" color={duskColors.primary} />
          <Text className="font-sans-semibold text-[12px] text-dusk-primary">
            AI is reading the page…
          </Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} className="mt-3 gap-2.5">
          <View className="h-20 items-start justify-start rounded-xl bg-dusk-primary/15 p-2">
            <View className="rounded-full bg-dusk-primary px-2 py-0.5">
              <Text className="font-sans-bold text-[9px] text-dusk-primary-fg">
                ARTICLE
              </Text>
            </View>
          </View>
          <Text className="font-sans-bold text-[14px] text-dusk-fg">
            The complete guide to AI agents in 2026
          </Text>
          <View className="flex-row items-start gap-1.5">
            <Ionicons name="sparkles" size={13} color={duskColors.primary} />
            <Text className="flex-1 font-sans text-[12px] text-dusk-muted">
              A tour of agent architectures, tool-use and the emerging
              multi-agent patterns.
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {["#AI", "#agents", "#to-read", "#dev"].map((tag) => (
              <View
                key={tag}
                className="rounded-full bg-dusk-raised px-2.5 py-1"
              >
                <Text className="font-sans-semibold text-[10.5px] text-dusk-cream">
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
