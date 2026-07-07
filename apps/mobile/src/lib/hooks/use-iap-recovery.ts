import { useAction } from "convex/react";
import { useEffect } from "react";

import { api } from "@convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  finishTransaction,
  getAvailableProPurchases,
  isIapAvailable,
} from "../purchases";

let hasStartedIapRecovery = false;

export function useIapRecovery() {
  const { isAuthenticated } = useAuth();
  const syncFromClient = useAction(api.appstore.actions.syncFromClient);

  useEffect(() => {
    if (!isIapAvailable() || !isAuthenticated || hasStartedIapRecovery) return;

    hasStartedIapRecovery = true;

    void (async () => {
      try {
        const purchases = await getAvailableProPurchases();
        const uniquePurchases = [
          ...new Map(
            purchases.map((purchase) => [
              purchase.originalTransactionId,
              purchase,
            ]),
          ).values(),
        ];

        for (const purchase of uniquePurchases) {
          try {
            await syncFromClient({
              originalTransactionId: purchase.originalTransactionId,
            });
            await finishTransaction(purchase.purchase);
          } catch (error) {
            console.warn("[iap.recovery] failed to sync purchase", {
              originalTransactionId: purchase.originalTransactionId,
              error,
            });
          }
        }
      } catch (error) {
        console.warn("[iap.recovery] failed to recover purchases", { error });
      }
    })();
  }, [isAuthenticated, syncFromClient]);
}
