import { Ionicons } from "@expo/vector-icons";
import type { OnboardingInterest } from "@convex/bookmarks/onboarding";
import { useAction, useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@convex/_generated/api";
import portalScene from "../assets/images/landing/portal-arch.webp";
import { DuskButton } from "../src/components/dusk/dusk-button";
import { DuskScene } from "../src/components/dusk/scene";
import { LoadingScreen, LoadingSpinner } from "../src/components/ui/loading";
import { StatusScreen } from "../src/components/ui/status-screen";
import { Text } from "../src/components/ui/text";
import { useAuth } from "../src/contexts/AuthContext";
import { hapticSuccess } from "../src/lib/haptics";
import {
  finishTransaction,
  getProSubscriptions,
  initIapConnection,
  isIapAvailable,
  isPurchaseCancelled,
  purchase as purchaseSubscription,
  restore as restoreSubscriptions,
  type ProPurchase,
  type ProSubscription,
} from "../src/lib/purchases";
import { duskColors } from "../src/lib/theme";
import { cn } from "../src/lib/utils";

type PlanOptionProps = {
  plan: ProSubscription;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

export type PaywallScreenProps = {
  sourceOverride?: "onboarding";
  onboardingInterestOverride?: OnboardingInterest;
  onLeaveOverride?: () => void;
  onBackToPlanChoiceOverride?: () => void;
};

function parseOnboardingInterest(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;

  switch (normalized) {
    case "articles":
    case "videos":
    case "threads":
    case "recipes":
    case "design":
    case "dev":
      return normalized satisfies OnboardingInterest;
    default:
      return "articles" satisfies OnboardingInterest;
  }
}

function PlanOption({ plan, selected, disabled, onPress }: PlanOptionProps) {
  const productId = plan.productId;
  const isYearly = productId.includes("yearly");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isYearly ? "Annual" : "Monthly"} Pro plan, ${
        plan.priceString
      }`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "rounded-2xl border bg-dusk-card p-4 active:scale-[0.96]",
        selected ? "border-dusk-primary" : "border-white/10",
        disabled && "opacity-60",
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-bold text-[18px] text-dusk-fg">
              {isYearly ? "Annual" : "Monthly"}
            </Text>
          </View>
          <Text className="font-sans text-[13px] text-dusk-muted">
            50,000 bookmarks, more AI usage, export, and API access
          </Text>
        </View>
        <View className="items-end gap-2">
          <Text className="font-sans-bold text-[18px] text-dusk-fg">
            {plan.priceString}
          </Text>
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={selected ? duskColors.primary : duskColors.muted}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen({
  sourceOverride,
  onboardingInterestOverride,
  onLeaveOverride,
  onBackToPlanChoiceOverride,
}: PaywallScreenProps = {}) {
  const params = useLocalSearchParams<{
    source?: string | string[];
    interest?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const source =
    sourceOverride ??
    (Array.isArray(params.source) ? params.source[0] : params.source);
  const isOnboardingSource = source === "onboarding";
  const onboardingInterest =
    onboardingInterestOverride ?? parseOnboardingInterest(params.interest);
  const userPlan = useQuery(
    api.subscriptions.queries.getUserPlan,
    isAuthenticated ? {} : "skip",
  );
  const onboardingFlowState = useQuery(
    api.users.queries.getOnboardingFlowState,
    isAuthenticated && isOnboardingSource ? {} : "skip",
  );
  const completeOnboarding = useMutation(
    api.users.mutations.completeOnboarding,
  );
  const syncFromClient = useAction(api.appstore.actions.syncFromClient);
  const activeUserIdRef = useRef(user?.id ?? null);
  const onboardingAttemptRef = useRef(false);
  const isPro = userPlan?.plan === "pro";
  const [plans, setPlans] = useState<ProSubscription[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showActivationDelayNote, setShowActivationDelayNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated]);

  const finalizeOnboardingUpgrade = useCallback(() => {
    if (onboardingAttemptRef.current) return;

    onboardingAttemptRef.current = true;
    setIsCompletingOnboarding(true);
    setOnboardingError(null);

    void completeOnboarding({
      interest: onboardingInterest,
      offerChoice: "upgrade",
    })
      .catch(() => {
        onboardingAttemptRef.current = false;
        setOnboardingError(
          "We couldn’t finish your setup. Check your connection, then try again.",
        );
      })
      .finally(() => {
        setIsCompletingOnboarding(false);
      });
  }, [completeOnboarding, onboardingInterest]);

  useEffect(() => {
    if (
      isOnboardingSource &&
      onboardingFlowState?.needsOnboarding === true &&
      onboardingError === null
    ) {
      finalizeOnboardingUpgrade();
    }
  }, [
    finalizeOnboardingUpgrade,
    isOnboardingSource,
    onboardingError,
    onboardingFlowState?.needsOnboarding,
  ]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.productId === selectedId) ?? plans[0],
    [plans, selectedId],
  );
  const selectedPlanLabel = selectedPlan
    ? `${selectedPlan.title} ${selectedPlan.priceString}`
    : "selected plan";

  const leavePaywall = () => {
    if (onLeaveOverride) {
      onLeaveOverride();
      return;
    }

    if (isOnboardingSource) {
      router.replace("/(tabs)");
      return;
    }

    router.back();
  };

  const loadOfferings = useCallback(async () => {
    if (!isIapAvailable()) {
      setPlans([]);
      setSelectedId(null);
      setError("In-app purchases are not available on this device.");
      setIsLoadingOfferings(false);
      return;
    }

    setIsLoadingOfferings(true);
    setError(null);

    try {
      const proPlans = await getProSubscriptions();

      if (proPlans.length === 0) {
        throw new Error("No Pro plans are available right now.");
      }

      setPlans(proPlans);
      setSelectedId((current) => current ?? proPlans[0]?.productId ?? null);
    } catch (loadError) {
      setPlans([]);
      setSelectedId(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load Pro plans.",
      );
    } finally {
      setIsLoadingOfferings(false);
    }
  }, []);

  useEffect(() => {
    if (!isIapAvailable()) return;

    void initIapConnection();
  }, []);

  useEffect(() => {
    if (!isPro) {
      void loadOfferings();
    }
  }, [isPro, loadOfferings]);

  useEffect(() => {
    if (!isActivating || isPro) {
      setShowActivationDelayNote(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowActivationDelayNote(true);
    }, 20000);

    return () => clearTimeout(timeout);
  }, [isActivating, isPro]);

  useEffect(() => {
    if (!isActivating || !isPro) return;

    hapticSuccess();
    setIsActivating(false);
  }, [isActivating, isPro]);

  const syncAndFinishPurchase = useCallback(
    async (
      { originalTransactionId, purchase }: ProPurchase,
      expectedUserId: string,
    ) => {
      if (activeUserIdRef.current !== expectedUserId) {
        throw new Error("Your account changed. Start the purchase again.");
      }

      const syncResult = await syncFromClient({ originalTransactionId });

      if (activeUserIdRef.current !== expectedUserId) {
        throw new Error("Your account changed before activation finished.");
      }

      await finishTransaction(purchase);
      return syncResult.plan === "pro";
    },
    [syncFromClient],
  );

  const purchase = async () => {
    if (!selectedPlan || isPurchasing || isRestoring || isActivating) return;
    const purchasingUserId = activeUserIdRef.current;
    if (!purchasingUserId) return;

    setIsPurchasing(true);
    setError(null);
    setShowActivationDelayNote(false);

    try {
      const result = await purchaseSubscription(selectedPlan.productId);
      const grantedPro = await syncAndFinishPurchase(result, purchasingUserId);

      if (grantedPro) {
        setIsActivating(true);
        return;
      }

      setError("Purchase completed, but Pro is not active yet.");
    } catch (purchaseError) {
      if (!isPurchaseCancelled(purchaseError)) {
        setError(
          purchaseError instanceof Error
            ? purchaseError.message
            : "Could not complete purchase.",
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const restore = async () => {
    if (isPurchasing || isRestoring || isActivating) return;
    const restoringUserId = activeUserIdRef.current;
    if (!restoringUserId) return;

    setIsRestoring(true);
    setError(null);
    setShowActivationDelayNote(false);

    try {
      const restoredPurchases = await restoreSubscriptions();
      const uniquePurchases = [
        ...new Map(
          restoredPurchases.map((restoredPurchase) => [
            restoredPurchase.originalTransactionId,
            restoredPurchase,
          ]),
        ).values(),
      ];

      let grantedPro = false;
      let lastSyncError: unknown = null;

      for (const restoredPurchase of uniquePurchases) {
        try {
          grantedPro =
            (await syncAndFinishPurchase(restoredPurchase, restoringUserId)) ||
            grantedPro;
        } catch (syncError) {
          lastSyncError = syncError;
        }
      }

      if (grantedPro) {
        setIsActivating(true);
        return;
      }

      if (lastSyncError) {
        throw lastSyncError;
      }

      setError("No active Pro purchase was found for this Apple ID.");
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Could not restore purchases.",
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const openLegalLink = async (path: "terms" | "privacy") => {
    await WebBrowser.openBrowserAsync(`https://saveit.now/${path}`);
  };

  if (
    isAuthLoading ||
    !isAuthenticated ||
    userPlan === undefined ||
    (isOnboardingSource && onboardingFlowState === undefined) ||
    isCompletingOnboarding
  ) {
    return <LoadingScreen />;
  }

  if (isOnboardingSource && onboardingError) {
    return (
      <StatusScreen
        variant="dusk"
        icon="cloud-offline-outline"
        title="Setup needs one more try"
        message={onboardingError}
        footer={
          <View className="w-full max-w-[320px] gap-3">
            <DuskButton onPress={finalizeOnboardingUpgrade}>
              Try again
            </DuskButton>
            <DuskButton
              variant="glass"
              onPress={() => {
                if (onBackToPlanChoiceOverride) {
                  onBackToPlanChoiceOverride();
                  return;
                }

                router.replace("/welcome");
              }}
            >
              Back to plan choice
            </DuskButton>
          </View>
        }
      />
    );
  }

  if (isOnboardingSource && onboardingFlowState?.needsOnboarding) {
    return <LoadingScreen />;
  }

  if (isPro) {
    return (
      <StatusScreen
        variant="dusk"
        icon="sparkles"
        title="You're on Pro"
        message="SaveIt Pro is active on this account."
        footer={
          <DuskButton variant="glass" onPress={leavePaywall} className="mt-2">
            Done
          </DuskButton>
        }
      />
    );
  }

  if (isActivating) {
    return (
      <StatusScreen
        variant="dusk"
        spinner
        title="Activating your subscription"
        message="SaveIt Pro will unlock here as soon as your account updates."
        footer={
          <DuskButton variant="glass" onPress={leavePaywall} className="mt-2">
            Done
          </DuskButton>
        }
      >
        {showActivationDelayNote ? (
          <View className="rounded-2xl border border-white/10 bg-dusk-card px-4 py-3">
            <Text className="max-w-[300px] text-center font-sans text-[13px] leading-[19px] text-dusk-muted">
              This can take a minute. Your purchase is confirmed by the App
              Store. If Pro doesn&apos;t unlock shortly, restart the app or
              contact help@saveit.now.
            </Text>
          </View>
        ) : null}
      </StatusScreen>
    );
  }

  return (
    <View className="flex-1 bg-dusk">
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View className="gap-6">
          <View className="flex-row items-center justify-between">
            <Text className="font-serif text-[30px] text-dusk-fg">
              SaveIt{" "}
              <Text className="font-serif-italic text-[30px] text-dusk-primary">
                Pro
              </Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close paywall"
              onPress={leavePaywall}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-[0.96]"
            >
              <Ionicons name="close" size={18} color={duskColors.foreground} />
            </Pressable>
          </View>

          <DuskScene
            source={portalScene}
            className="h-44 justify-end p-5"
            imagePosition={{ top: "45%", left: "50%" }}
          >
            <Text className="font-serif text-[26px] leading-[31px] text-dusk-fg">
              Go{" "}
              <Text className="font-serif-italic text-[26px] leading-[31px] text-dusk-fg">
                further.
              </Text>
            </Text>
            <Text className="mt-1 font-sans text-[13px] leading-[19px] text-dusk-cream">
              More room, more AI, more answers.
            </Text>
          </DuskScene>

          <Text className="font-sans text-[15px] leading-[22px] text-dusk-muted">
            Build a library of up to 50,000 bookmarks, process more saves with
            AI, ask more chat questions, export your data, and use API access.
          </Text>

          <View className="gap-3">
            <Text className="font-sans-semibold text-[13px] uppercase tracking-wider text-dusk-muted">
              Choose a plan
            </Text>
            {isLoadingOfferings ? (
              <View className="items-center justify-center rounded-2xl border border-white/10 bg-dusk-card py-10">
                <LoadingSpinner color={duskColors.foreground} />
              </View>
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <PlanOption
                  key={plan.productId}
                  plan={plan}
                  selected={plan.productId === selectedPlan?.productId}
                  disabled={isPurchasing || isRestoring}
                  onPress={() => setSelectedId(plan.productId)}
                />
              ))
            ) : null}
          </View>

          {error ? (
            <View className="rounded-2xl border border-dusk-destructive/25 bg-dusk-destructive/10 px-4 py-3">
              <Text className="font-sans text-[13px] text-dusk-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="gap-3">
            {plans.length > 0 ? (
              <DuskButton
                loading={isPurchasing}
                disabled={!selectedPlan || isLoadingOfferings || isRestoring}
                onPress={purchase}
              >
                {`Upgrade to Pro · ${selectedPlanLabel}`}
              </DuskButton>
            ) : (
              <DuskButton
                variant="glass"
                loading={isLoadingOfferings}
                disabled={isLoadingOfferings}
                onPress={loadOfferings}
              >
                Retry
              </DuskButton>
            )}
            <DuskButton
              variant="ghost"
              loading={isRestoring}
              disabled={isPurchasing || isLoadingOfferings}
              onPress={restore}
            >
              Restore Purchases
            </DuskButton>
            {isOnboardingSource ? (
              <DuskButton
                variant="glass"
                disabled={isPurchasing || isRestoring}
                onPress={leavePaywall}
              >
                Continue with Free
              </DuskButton>
            ) : null}
          </View>

          <Text className="px-2 text-center font-sans text-[12px] leading-[18px] text-dusk-muted">
            Payment is charged to your Apple ID. Your subscription renews
            automatically until canceled in App Store settings.
          </Text>

          <View className="flex-row flex-wrap items-center justify-center gap-2 pb-2">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Terms"
              onPress={() => openLegalLink("terms")}
              className="min-h-11 justify-center px-2 py-1 active:opacity-70"
            >
              <Text className="font-sans-semibold text-[13px] text-dusk-primary">
                Terms
              </Text>
            </Pressable>
            <Text className="font-sans text-[13px] text-dusk-muted">and</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Privacy"
              onPress={() => openLegalLink("privacy")}
              className="min-h-11 justify-center px-2 py-1 active:opacity-70"
            >
              <Text className="font-sans-semibold text-[13px] text-dusk-primary">
                Privacy
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
