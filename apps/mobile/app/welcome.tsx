import { Ionicons } from "@expo/vector-icons";
import { api } from "@convex/_generated/api";
import type { OnboardingInterest } from "@convex/bookmarks/onboarding";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../src/components/ui/button";
import { LoadingScreen, LoadingSpinner } from "../src/components/ui/loading";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";
import { useThemeColors } from "../src/lib/theme";
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
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      {/* progress */}
      <View className="flex-row items-center justify-center gap-2 pb-2">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={
              i === step
                ? "h-[6px] w-5 rounded-full bg-primary"
                : "h-[6px] w-[6px] rounded-full bg-border"
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

function PersonalizeStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: OnboardingInterest;
  onSelect: (key: OnboardingInterest) => void;
  onContinue: () => void;
}) {
  const colors = useThemeColors();

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
          <Text variant="title" className="text-[30px] leading-[35px]">
            What do you{" "}
            <Text
              variant="title"
              className="text-[30px] leading-[35px] text-primary"
            >
              save most?
            </Text>
          </Text>
          <Text variant="subtitle" className="max-w-[300px] text-[15px]">
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
                    ? "min-h-11 flex-row items-center gap-2 rounded-full border border-primary bg-accent px-4 py-2.5 active:scale-[0.96]"
                    : "min-h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 active:scale-[0.96]"
                }
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={isSel ? colors.primary : colors.foreground}
                />
                <Text
                  className={
                    isSel
                      ? "font-sans-semibold text-[14px] text-foreground"
                      : "font-sans-medium text-[14px] text-foreground"
                  }
                >
                  {item.label}
                </Text>
                {isSel ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Button onPress={onContinue} className="active:scale-[0.96]">
        Continue
      </Button>
    </ScrollView>
  );
}

function ShareStep({ onContinue }: { onContinue: () => void }) {
  const colors = useThemeColors();

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
          <Text variant="title" className="text-[30px] leading-[35px]">
            Save from{" "}
            <Text
              variant="title"
              className="text-[30px] leading-[35px] text-primary"
            >
              anywhere.
            </Text>
          </Text>
          <Text variant="subtitle" className="max-w-[310px] text-[15px]">
            On any page, video or tweet: tap{" "}
            <Text className="font-sans-semibold text-[15px] text-foreground">
              Share
            </Text>{" "}
            then pick SaveIt. That&apos;s the whole trick.
          </Text>
        </View>

        {/* Mock iOS share sheet with SaveIt highlighted */}
        <Animated.View
          entering={FadeIn.duration(400).delay(200)}
          className="gap-3 rounded-3xl border border-border bg-muted p-4"
        >
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <View className="h-9 w-9 rounded-lg bg-primary/20" />
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="font-sans-bold text-[13px] text-foreground"
              >
                An article you&apos;re reading in Safari
              </Text>
              <Text className="font-sans text-[11px] text-muted-foreground">
                theverge.com
              </Text>
            </View>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </View>

          <View className="flex-row justify-around pt-1">
            <ShareApp icon="bookmark" label="SaveIt" highlighted />
            <ShareApp icon="chatbubble-outline" label="Messages" />
            <ShareApp icon="mail-outline" label="Mail" />
            <ShareApp icon="ellipsis-horizontal" label="More" />
          </View>
        </Animated.View>
      </Animated.View>

      <Button onPress={onContinue} className="active:scale-[0.96]">
        Continue
      </Button>
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
  const colors = useThemeColors();
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
            <LoadingSpinner />
            <Text variant="subtitle">Loading your plan…</Text>
          </View>
        ) : isAlreadyPro || !shouldShowOffer ? (
          <View className="items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Ionicons
                name="sparkles"
                size={28}
                color={colors.primaryForeground}
              />
            </View>
            <View className="items-center gap-2">
              <Text
                variant="title"
                className="text-center text-[30px] leading-[35px]"
              >
                {isAlreadyPro ? "Your Pro plan is ready." : "You’re all set."}
              </Text>
              <Text variant="subtitle" className="max-w-[310px] text-center">
                {isAlreadyPro
                  ? "Your SaveIt Pro benefits are already active on this account."
                  : "Your plan choice is saved. Your library is ready."}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View className="gap-3">
              <Text variant="title" className="text-[30px] leading-[35px]">
                More room when{" "}
                <Text
                  variant="title"
                  className="text-[30px] leading-[35px] text-primary"
                >
                  you need it.
                </Text>
              </Text>
              <Text variant="subtitle" className="max-w-[320px] text-[15px]">
                Upgrade now, or start free with 20 bookmarks and 10 chat
                questions each month. You can change plans anytime.
              </Text>
            </View>

            <View className="gap-2 rounded-2xl border border-border bg-card p-4">
              {PRO_BENEFITS.map((benefit) => (
                <View
                  key={benefit.text}
                  className="min-h-11 flex-row items-center gap-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <Ionicons
                      name={benefit.icon}
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                  <Text className="flex-1 font-sans-medium text-[14px] text-foreground">
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
              className="text-center font-sans text-[13px] leading-[19px] text-destructive"
            >
              {error}
            </Text>
          ) : null}

          {isAlreadyPro || !shouldShowOffer ? (
            <Button
              onPress={onOpenLibrary}
              loading={finishingChoice === "library"}
              disabled={finishingChoice !== null}
              className="active:scale-[0.96]"
            >
              Open my library
            </Button>
          ) : (
            <>
              <Button
                onPress={onChooseUpgrade}
                loading={finishingChoice === "upgrade"}
                disabled={finishingChoice !== null}
                className="active:scale-[0.96]"
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="outline"
                onPress={onChooseFree}
                loading={finishingChoice === "free"}
                disabled={finishingChoice !== null}
                className="active:scale-[0.96]"
              >
                Continue with Free
              </Button>
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
  const colors = useThemeColors();
  return (
    <View className="items-center gap-1.5" style={{ width: 60 }}>
      <View
        className={
          highlighted
            ? "h-14 w-14 items-center justify-center rounded-2xl bg-primary"
            : "h-14 w-14 items-center justify-center rounded-2xl bg-secondary"
        }
      >
        <Ionicons
          name={icon}
          size={24}
          color={
            highlighted ? colors.primaryForeground : colors.mutedForeground
          }
        />
      </View>
      <Text
        className={
          highlighted
            ? "font-sans-bold text-[10px] text-primary"
            : "font-sans text-[10px] text-muted-foreground"
        }
      >
        {label}
      </Text>
    </View>
  );
}
