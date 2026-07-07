import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction as finishIapTransaction,
  getAvailablePurchases,
  initConnection,
  requestPurchase,
  type ProductSubscription,
  type Purchase,
} from "expo-iap";

export const PRO_PRODUCT_IDS = [
  "now.saveit.saveitapp.pro.monthly",
  "now.saveit.saveitapp.pro.yearly",
] as const;

const PRO_PRODUCT_ID_SET = new Set<string>(PRO_PRODUCT_IDS);

export type ProProductId = (typeof PRO_PRODUCT_IDS)[number];

export type ProSubscription = {
  productId: ProProductId;
  title: string;
  priceString: string;
  product: ProductSubscription;
};

export type ProPurchase = {
  originalTransactionId: string;
  purchase: Purchase;
};

let connectionPromise: Promise<void> | null = null;
let isConnected = false;

export function isIapAvailable() {
  return Platform.OS === "ios";
}

function assertIapAvailable() {
  if (!isIapAvailable()) {
    throw new Error("In-app purchases are not available on this device.");
  }
}

function sortProductIds(left: string, right: string) {
  if (left.includes("yearly")) return -1;
  if (right.includes("yearly")) return 1;
  if (left.includes("monthly")) return -1;
  if (right.includes("monthly")) return 1;
  return left.localeCompare(right);
}

function normalizeProductId(productId: string): ProProductId | null {
  return PRO_PRODUCT_ID_SET.has(productId) ? (productId as ProProductId) : null;
}

function getOriginalTransactionId(purchase: Purchase) {
  return (
    ("originalTransactionIdentifierIOS" in purchase
      ? purchase.originalTransactionIdentifierIOS
      : null) ??
    ("transactionId" in purchase ? purchase.transactionId : null) ??
    null
  );
}

function toPurchaseArray(result: Purchase | Purchase[] | null) {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export function isPurchaseCancelled(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const code = "code" in error ? error.code : null;
  return code === "user-cancelled" || code === "E_USER_CANCELLED";
}

export async function initIapConnection() {
  if (!isIapAvailable()) return;
  if (isConnected) return;

  connectionPromise ??= initConnection().then(() => {
    isConnected = true;
  });

  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    isConnected = false;
    throw error;
  }
}

export async function getProSubscriptions(): Promise<ProSubscription[]> {
  assertIapAvailable();
  await initIapConnection();

  const products = (await fetchProducts({
    skus: [...PRO_PRODUCT_IDS],
    type: "subs",
  })) as ProductSubscription[];

  return products
    .map((product: ProductSubscription) => {
      const productId = normalizeProductId(product.id);
      if (!productId) return null;

      return {
        productId,
        title: productId.includes("yearly") ? "Annual" : "Monthly",
        priceString: product.displayPrice,
        product,
      };
    })
    .filter((product): product is ProSubscription => product !== null)
    .sort((left: ProSubscription, right: ProSubscription) =>
      sortProductIds(left.productId, right.productId),
    );
}

export async function purchase(
  productId: ProProductId,
): Promise<ProPurchase> {
  assertIapAvailable();
  await initIapConnection();

  const result = (await requestPurchase({
    request: {
      apple: {
        sku: productId,
        andDangerouslyFinishTransactionAutomatically: false,
      },
    },
    type: "subs",
  })) as Purchase | Purchase[] | null;

  const purchase = toPurchaseArray(result).find((item) => {
    return item.productId === productId;
  });
  const originalTransactionId = purchase
    ? getOriginalTransactionId(purchase)
    : null;

  if (!purchase || !originalTransactionId) {
    throw new Error(
      "Purchase completed, but no App Store transaction was returned.",
    );
  }

  return { originalTransactionId, purchase };
}

export async function restore(): Promise<ProPurchase[]> {
  assertIapAvailable();
  await initIapConnection();

  const purchases = (await getAvailablePurchases({
    onlyIncludeActiveItemsIOS: true,
  })) as Purchase[];

  return purchases
    .filter((purchase: Purchase) => PRO_PRODUCT_ID_SET.has(purchase.productId))
    .map((purchase: Purchase) => {
      const originalTransactionId = getOriginalTransactionId(purchase);
      if (!originalTransactionId) return null;

      return {
        originalTransactionId,
        purchase,
      };
    })
    .filter((purchase): purchase is ProPurchase => purchase !== null);
}

export async function getAvailableProPurchases(): Promise<ProPurchase[]> {
  assertIapAvailable();
  await initIapConnection();

  const purchases = (await getAvailablePurchases({
    onlyIncludeActiveItemsIOS: false,
  })) as Purchase[];

  return purchases
    .filter((purchase: Purchase) => PRO_PRODUCT_ID_SET.has(purchase.productId))
    .map((purchase: Purchase) => {
      const originalTransactionId = getOriginalTransactionId(purchase);
      if (!originalTransactionId) return null;

      return {
        originalTransactionId,
        purchase,
      };
    })
    .filter((purchase): purchase is ProPurchase => purchase !== null);
}

export async function finishTransaction(purchase: Purchase) {
  if (!isIapAvailable()) return;

  await finishIapTransaction({
    purchase,
    isConsumable: false,
  });
}
