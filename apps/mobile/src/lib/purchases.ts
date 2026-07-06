import { Platform } from "react-native";
import Purchases from "react-native-purchases";

import { mobileConfig } from "./config";

export const PRO_ENTITLEMENT_ID = "pro";

let configuredUserId: string | null = null;

export function isPurchasesAvailable() {
  return Platform.OS === "ios" && mobileConfig.revenueCatIosApiKey.length > 0;
}

export async function configurePurchases(userId: string) {
  if (!isPurchasesAvailable() || !userId) return;
  if (configuredUserId === userId) return;

  try {
    Purchases.configure({
      apiKey: mobileConfig.revenueCatIosApiKey,
      appUserID: userId,
    });
    configuredUserId = userId;
  } catch (error) {
    configuredUserId = null;
    console.warn("[purchases] Failed to configure RevenueCat", error);
  }
}

export async function resetPurchases() {
  if (!isPurchasesAvailable()) {
    configuredUserId = null;
    return;
  }

  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn("[purchases] Failed to reset RevenueCat", error);
  } finally {
    configuredUserId = null;
  }
}
