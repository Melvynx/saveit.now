import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@convex/_generated/api";
import { BlurHeaderScreen } from "../src/components/ui/blur-header-screen";
import { Button } from "../src/components/ui/button";
import { LoadingSpinner } from "../src/components/ui/loading";
import { StatusScreen } from "../src/components/ui/status-screen";
import { Text } from "../src/components/ui/text";
import { isPurchasesAvailable, PRO_ENTITLEMENT_ID } from "../src/lib/purchases";
import { hapticSuccess } from "../src/lib/haptics";
import { useThemeColors } from "../src/lib/theme";
import { cn } from "../src/lib/utils";

const PRO_PRODUCT_IDS = new Set([
  "now.saveit.saveitapp.pro.monthly",
  "now.saveit.saveitapp.pro.yearly",
]);

function hasProEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}

function getPackageRank(pkg: PurchasesPackage) {
  const productId = pkg.product.identifier;
  if (productId.includes("yearly")) return 0;
  if (productId.includes("monthly")) return 1;
  return 2;
}

function isUserCancelled(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "userCancelled" in error &&
    Boolean((error as { userCancelled?: unknown }).userCancelled)
  );
}

type PlanOptionProps = {
  pkg: PurchasesPackage;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

function PlanOption({ pkg, selected, disabled, onPress }: PlanOptionProps) {
  const colors = useThemeColors();
  const productId = pkg.product.identifier;
  const isYearly = productId.includes("yearly");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isYearly ? "Annual" : "Monthly"} Pro plan, ${
        pkg.product.priceString
      }`}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "rounded-2xl border bg-card p-4 active:opacity-80",
        selected ? "border-primary" : "border-border",
        disabled && "opacity-60",
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-bold text-[18px] text-foreground">
              {isYearly ? "Annual" : "Monthly"}
            </Text>
            {isYearly ? (
              <View className="rounded-full bg-primary/10 px-2 py-1">
                <Text className="font-sans-semibold text-[12px] text-primary">
                  2 months free
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="font-sans text-[13px] text-muted-foreground">
            Unlimited saves, exports, chat, and API access
          </Text>
        </View>
        <View className="items-end gap-2">
          <Text className="font-sans-bold text-[18px] text-foreground">
            {pkg.product.priceString}
          </Text>
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={selected ? colors.primary : colors.mutedForeground}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const userPlan = useQuery(api.subscriptions.queries.getUserPlan);
  const isPro = userPlan?.plan === "pro";
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showActivationDelayNote, setShowActivationDelayNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.identifier === selectedId) ?? packages[0],
    [packages, selectedId],
  );

  const loadOfferings = useCallback(async () => {
    if (!isPurchasesAvailable()) {
      setPackages([]);
      setSelectedId(null);
      setError("In-app purchases are not available on this device.");
      setIsLoadingOfferings(false);
      return;
    }

    setIsLoadingOfferings(true);
    setError(null);

    try {
      const offerings = await Purchases.getOfferings();
      const availablePackages = offerings.current?.availablePackages ?? [];
      const proPackages = availablePackages
        .filter((pkg) => PRO_PRODUCT_IDS.has(pkg.product.identifier))
        .sort((a, b) => getPackageRank(a) - getPackageRank(b));

      if (proPackages.length === 0) {
        throw new Error("No Pro plans are available right now.");
      }

      setPackages(proPackages);
      setSelectedId((current) => current ?? proPackages[0]?.identifier ?? null);
    } catch (loadError) {
      setPackages([]);
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

  const purchase = async () => {
    if (!selectedPackage || isPurchasing || isRestoring || isActivating) return;

    setIsPurchasing(true);
    setError(null);
    setShowActivationDelayNote(false);

    try {
      const result = await Purchases.purchasePackage(selectedPackage);
      if (hasProEntitlement(result.customerInfo)) {
        setIsActivating(true);
        return;
      }

      setError("Purchase completed, but Pro is not active yet.");
    } catch (purchaseError) {
      if (!isUserCancelled(purchaseError)) {
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

    setIsRestoring(true);
    setError(null);
    setShowActivationDelayNote(false);

    try {
      const customerInfo = await Purchases.restorePurchases();
      if (hasProEntitlement(customerInfo)) {
        setIsActivating(true);
        return;
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

  if (isPro) {
    return (
      <StatusScreen
        icon="sparkles"
        title="You're on Pro"
        message="SaveIt Pro is active on this account."
        badgeClassName="bg-primary"
        footer={
          <Button
            variant="secondary"
            onPress={() => router.back()}
            className="mt-2"
          >
            Done
          </Button>
        }
      />
    );
  }

  if (isActivating) {
    return (
      <StatusScreen
        spinner
        title="Activating your subscription"
        message="SaveIt Pro will unlock here as soon as your account updates."
        badgeClassName="bg-primary"
        footer={
          <Button
            variant="secondary"
            onPress={() => router.back()}
            className="mt-2"
          >
            Done
          </Button>
        }
      >
        {showActivationDelayNote ? (
          <View className="rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="max-w-[300px] text-center font-sans text-[13px] leading-[19px] text-muted-foreground">
              This can take a minute. Your purchase is confirmed by the App
              Store. If Pro doesn't unlock shortly, restart the app or contact
              help@saveit.now.
            </Text>
          </View>
        ) : null}
      </StatusScreen>
    );
  }

  return (
    <BlurHeaderScreen
      title="SaveIt Pro"
      contentTopOffset={8}
      headerTopPadding={24}
      trailing={
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Close paywall"
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={18} color={colors.foreground} />
        </Button>
      }
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <View className="gap-6">
        <View className="gap-3 rounded-2xl border border-border bg-card p-5">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </View>
          <View className="gap-2">
            <Text className="font-sans-bold text-[24px] leading-[30px] text-foreground">
              Unlock your full library
            </Text>
            <Text className="font-sans text-[15px] leading-[22px] text-muted-foreground">
              Save without limits, export your data, ask more AI questions, and
              use API access from one Pro plan.
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text variant="section-label">Choose a plan</Text>
          {isLoadingOfferings ? (
            <View className="items-center justify-center rounded-2xl border border-border bg-card py-10">
              <LoadingSpinner />
            </View>
          ) : packages.length > 0 ? (
            packages.map((pkg) => (
              <PlanOption
                key={pkg.identifier}
                pkg={pkg}
                selected={pkg.identifier === selectedPackage?.identifier}
                disabled={isPurchasing || isRestoring}
                onPress={() => setSelectedId(pkg.identifier)}
              />
            ))
          ) : null}
        </View>

        {error ? (
          <View className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            <Text className="font-sans text-[13px] text-destructive">
              {error}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          {packages.length > 0 ? (
            <Button
              loading={isPurchasing}
              disabled={!selectedPackage || isLoadingOfferings || isRestoring}
              onPress={purchase}
              className="rounded-2xl"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={isLoadingOfferings}
              disabled={isLoadingOfferings}
              onPress={loadOfferings}
              className="rounded-2xl"
            >
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            loading={isRestoring}
            disabled={isPurchasing || isLoadingOfferings}
            onPress={restore}
          >
            Restore Purchases
          </Button>
        </View>

        <View className="flex-row flex-wrap items-center justify-center gap-2 pb-2">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms"
            onPress={() => openLegalLink("terms")}
            className="px-2 py-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-[13px] text-primary">
              Terms
            </Text>
          </Pressable>
          <Text className="font-sans text-[13px] text-muted-foreground">
            and
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy"
            onPress={() => openLegalLink("privacy")}
            className="px-2 py-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-[13px] text-primary">
              Privacy
            </Text>
          </Pressable>
        </View>
      </View>
    </BlurHeaderScreen>
  );
}
