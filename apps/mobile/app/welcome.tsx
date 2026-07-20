import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import type { OnboardingInterest } from "@convex/bookmarks/onboarding";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import lakeScene from "../assets/images/landing/lake.webp";
import { DuskButton } from "../src/components/dusk/dusk-button";
import { DuskScene } from "../src/components/dusk/scene";
import { LoadingScreen, LoadingSpinner } from "../src/components/ui/loading";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";
import { duskColors } from "../src/lib/theme";
import PaywallScreen from "./paywall";

type Interest = {
  key: OnboardingInterest;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const INTERESTS: Interest[] = [
  { key: "articles", label: "Articles", icon: "newspaper-outline" },
  { key: "videos", label: "Videos", icon: "play-circle-outline" },
  { key: "threads", label: "X threads", icon: "logo-twitter" },
  { key: "recipes", label: "Recipes", icon: "restaurant-outline" },
  { key: "design", label: "Design", icon: "color-palette-outline" },
  { key: "dev", label: "Dev tools", icon: "code-slash-outline" },
];

/**
 * Post-signup onboarding — runs once per user. Three steps:
 *   1. Personalize (pick what you save most → tailors the seeded example)
 *   2. Teach the Share Sheet (the one activation action that's hard to find)
 *   3. Make the one-time Pro offer, with an equally explicit Free path
 * On either final choice it seeds a pre-enriched example bookmark when needed,
 * marks onboarding complete, and continues to the selected destination.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const completeOnboarding = useMutation(
    api.users.mutations.completeOnboarding,
  );
  const flowState = useQuery(
    api.users.queries.getOnboardingFlowState,
    isAuthenticated ? {} : "skip",
  );

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [interest, setInterest] = useState<OnboardingInterest>("articles");
  const [finishingChoice, setFinishingChoice] = useState<
    "free" | "upgrade" | "library" | null
  >(null);
  const finishingChoiceRef = useRef<"free" | "upgrade" | "library" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    // The Convex snapshot is the routing authority. Keep a pending final
    // choice mounted long enough to reach its intended paywall/library route.
    if (
      flowState?.needsOnboarding === false &&
      finishingChoiceRef.current === null
    ) {
      router.replace("/(tabs)");
    }
  }, [
    finishingChoice,
    flowState?.needsOnboarding,
    isAuthLoading,
    isAuthenticated,
    router,
  ]);

  const finish = async (choice: "free" | "upgrade" | "library") => {
    if (finishingChoiceRef.current) return;
    // The ref closes the Convex-reactivity race synchronously. The mutation can
    // update flowState before React commits the visual loading state.
    finishingChoiceRef.current = choice;
    setFinishingChoice(choice);
    setError(null);

    if (choice === "upgrade") {
      // Keep the real paywall inside this route. That makes Upgrade a literal
      // fourth onboarding step and prevents any root-stack redirect from
      // overtaking the one-time offer while its backend choice is finalized.
      return;
    }

    try {
      await completeOnboarding({
        interest,
        ...(choice === "library" ? {} : { offerChoice: choice }),
      });
      router.replace("/(tabs)");
    } catch {
      setError(
        "We couldn’t finish your setup. Check your connection, then try again.",
      );
      finishingChoiceRef.current = null;
      setFinishingChoice(null);
    }
  };

  if (
    isAuthLoading ||
    !isAuthenticated ||
    flowState === undefined ||
    (flowState.needsOnboarding === false && finishingChoice === null)
  ) {
    return <LoadingScreen />;
  }

  if (finishingChoice === "upgrade") {
    return (
      <PaywallScreen
        sourceOverride="onboarding"
        onboardingInterestOverride={interest}
        onLeaveOverride={() => router.replace("/(tabs)")}
        onBackToPlanChoiceOverride={() => {
          finishingChoiceRef.current = null;
          setFinishingChoice(null);
        }}
      />
    );
  }

  return (
    <View
      className="flex-1 bg-dusk"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <StatusBar style="light" />
      {/* progress */}
      <View className="flex-row items-center justify-center gap-2 pb-2">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={
              i === step
                ? "h-[6px] w-5 rounded-full bg-dusk-primary"
                : "h-[6px] w-[6px] rounded-full bg-white/20"
            }
          />
        ))}
      </View>

      {step === 0 ? (
        <PersonalizeStep
          selected={interest}
          onSelect={setInterest}
          onContinue={() => setStep(1)}
        />
      ) : step === 1 ? (
        <ShareStep
          onContinue={() => {
            setError(null);
            setStep(2);
          }}
        />
      ) : (
        <PlanStep
          flowState={flowState}
          finishingChoice={finishingChoice}
          error={error}
          onChooseFree={() => finish("free")}
          onChooseUpgrade={() => finish("upgrade")}
          onOpenLibrary={() => {
            if (flowState?.needsOnboarding === false) {
              router.replace("/(tabs)");
              return;
            }

            void finish("library");
          }}
        />
      )}
    </View>
  );
}

function StepTitle({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <Text className="font-serif text-[32px] leading-[38px] text-dusk-fg">
      {children}{" "}
      <Text className="font-serif-italic text-[32px] leading-[38px] text-dusk-primary">
        {accent}
      </Text>
    </Text>
  );
}

function PersonalizeStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: OnboardingInterest;
  onSelect: (key: OnboardingInterest) => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.duration(400).delay(60)}
        className="flex-1 justify-center gap-6"
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <DuskScene
            source={lakeScene}
            className="h-32 justify-end p-4"
            imagePosition={{ top: "40%", left: "50%" }}
          >
            <Text className="font-serif text-[22px] text-dusk-fg">
              Welcome{" "}
              <Text className="font-serif-italic text-[22px] text-dusk-peach">
                home
              </Text>
              .
            </Text>
          </DuskScene>
        </Animated.View>

        <View className="gap-3">
          <StepTitle accent="save most?">What do you</StepTitle>
          <Text className="max-w-[300px] font-sans text-[15px] leading-[21px] text-dusk-muted">
            Pick one — we&apos;ll drop a relevant example in your library to
            start.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5">
          {INTERESTS.map((item) => {
            const isSel = selected === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isSel }}
                onPress={() => onSelect(item.key)}
                className={
                  isSel
                    ? "min-h-11 flex-row items-center gap-2 rounded-full border border-dusk-primary bg-dusk-primary/15 px-4 py-2.5 active:scale-[0.96]"
                    : "min-h-11 flex-row items-center gap-2 rounded-full border border-white/10 bg-dusk-card px-4 py-2.5 active:scale-[0.96]"
                }
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={isSel ? duskColors.primary : duskColors.cream}
                />
                <Text
                  className={
                    isSel
                      ? "font-sans-semibold text-[14px] text-dusk-fg"
                      : "font-sans-medium text-[14px] text-dusk-fg"
                  }
                >
                  {item.label}
                </Text>
                {isSel ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={duskColors.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <DuskButton onPress={onContinue}>Continue</DuskButton>
    </ScrollView>
  );
}

function ShareStep({ onContinue }: { onContinue: () => void }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.duration(400).delay(60)}
        className="flex-1 justify-center gap-6"
      >
        <View className="gap-3">
          <StepTitle accent="anywhere.">Save from</StepTitle>
          <Text className="max-w-[310px] font-sans text-[15px] leading-[21px] text-dusk-muted">
            On any page, video or tweet: tap{" "}
            <Text className="font-sans-semibold text-[15px] text-dusk-fg">
              Share
            </Text>{" "}
            then pick SaveIt. That&apos;s the whole trick.
          </Text>
        </View>

        {/* Mock iOS share sheet with SaveIt highlighted */}
        <Animated.View
          entering={FadeIn.duration(400).delay(200)}
          className="gap-3 rounded-3xl border border-white/10 bg-dusk-card p-4"
        >
          <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-dusk-raised p-3">
            <View className="h-9 w-9 rounded-lg bg-dusk-primary/20" />
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="font-sans-bold text-[13px] text-dusk-fg"
              >
                An article you&apos;re reading in Safari
              </Text>
              <Text className="font-sans text-[11px] text-dusk-muted">
                theverge.com
              </Text>
            </View>
            <Ionicons
              name="share-outline"
              size={20}
              color={duskColors.primary}
            />
          </View>

          <View className="flex-row justify-around pt-1">
            <ShareApp icon="bookmark" label="SaveIt" highlighted />
            <ShareApp icon="chatbubble-outline" label="Messages" />
            <ShareApp icon="mail-outline" label="Mail" />
            <ShareApp icon="ellipsis-horizontal" label="More" />
          </View>
        </Animated.View>
      </Animated.View>

      <DuskButton onPress={onContinue}>Continue</DuskButton>
    </ScrollView>
  );
}

type OnboardingFlowState = {
  needsOnboarding: boolean;
  offerChoice: "free" | "upgrade" | null;
  effectivePlan: "free" | "pro";
  shouldShowUpgradeOffer: boolean;
};

const PRO_BENEFITS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}> = [
  { icon: "bookmark-outline", text: "Save up to 50,000 bookmarks" },
  { icon: "sparkles-outline", text: "1,500 AI bookmark runs each month" },
  { icon: "chatbubbles-outline", text: "200 chat questions each month" },
  { icon: "download-outline", text: "Export and API access included" },
];

function PlanStep({
  flowState,
  finishingChoice,
  error,
  onChooseFree,
  onChooseUpgrade,
  onOpenLibrary,
}: {
  flowState: OnboardingFlowState | undefined;
  finishingChoice: "free" | "upgrade" | "library" | null;
  error: string | null;
  onChooseFree: () => void;
  onChooseUpgrade: () => void;
  onOpenLibrary: () => void;
}) {
  const isLoading = flowState === undefined;
  const isAlreadyPro = flowState?.effectivePlan === "pro";
  const shouldShowOffer = flowState?.shouldShowUpgradeOffer === true;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.duration(400).delay(60)}
        className="flex-1 justify-center gap-6"
      >
        {isLoading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your plan"
            className="items-center gap-3"
          >
            <LoadingSpinner color={duskColors.foreground} />
            <Text className="font-sans text-[15px] text-dusk-muted">
              Loading your plan…
            </Text>
          </View>
        ) : isAlreadyPro || !shouldShowOffer ? (
          <View className="items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-dusk-primary">
              <Ionicons
                name="sparkles"
                size={28}
                color={duskColors.primaryForeground}
              />
            </View>
            <View className="items-center gap-2">
              <Text className="text-center font-serif text-[32px] leading-[38px] text-dusk-fg">
                {isAlreadyPro ? "Your Pro plan is ready." : "You’re all set."}
              </Text>
              <Text className="max-w-[310px] text-center font-sans text-[15px] leading-[21px] text-dusk-muted">
                {isAlreadyPro
                  ? "Your SaveIt Pro benefits are already active on this account."
                  : "Your plan choice is saved. Your library is ready."}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View className="gap-3">
              <StepTitle accent="you need it.">More room when</StepTitle>
              <Text className="max-w-[320px] font-sans text-[15px] leading-[21px] text-dusk-muted">
                Upgrade now, or start free with 20 bookmarks and 10 chat
                questions each month. You can change plans anytime.
              </Text>
            </View>

            <View className="gap-2 rounded-2xl border border-white/10 bg-dusk-card p-4">
              {PRO_BENEFITS.map((benefit) => (
                <View
                  key={benefit.text}
                  className="min-h-11 flex-row items-center gap-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-dusk-raised">
                    <Ionicons
                      name={benefit.icon}
                      size={17}
                      color={duskColors.primary}
                    />
                  </View>
                  <Text className="flex-1 font-sans-medium text-[14px] text-dusk-fg">
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Animated.View>

      {!isLoading ? (
        <View className="gap-3">
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-center font-sans text-[13px] leading-[19px] text-dusk-destructive"
            >
              {error}
            </Text>
          ) : null}

          {isAlreadyPro || !shouldShowOffer ? (
            <DuskButton
              onPress={onOpenLibrary}
              loading={finishingChoice === "library"}
              disabled={finishingChoice !== null}
            >
              Open my library
            </DuskButton>
          ) : (
            <>
              <DuskButton
                onPress={onChooseUpgrade}
                loading={finishingChoice === "upgrade"}
                disabled={finishingChoice !== null}
              >
                Upgrade to Pro
              </DuskButton>
              <DuskButton
                variant="glass"
                onPress={onChooseFree}
                loading={finishingChoice === "free"}
                disabled={finishingChoice !== null}
              >
                Continue with Free
              </DuskButton>
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ShareApp({
  icon,
  label,
  highlighted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <View className="items-center gap-1.5" style={{ width: 60 }}>
      <View
        className={
          highlighted
            ? "h-14 w-14 items-center justify-center rounded-2xl bg-dusk-primary"
            : "h-14 w-14 items-center justify-center rounded-2xl bg-dusk-raised"
        }
      >
        <Ionicons
          name={icon}
          size={24}
          color={
            highlighted ? duskColors.primaryForeground : duskColors.muted
          }
        />
      </View>
      <Text
        className={
          highlighted
            ? "font-sans-bold text-[10px] text-dusk-primary"
            : "font-sans text-[10px] text-dusk-muted"
        }
      >
        {label}
      </Text>
    </View>
  );
}
