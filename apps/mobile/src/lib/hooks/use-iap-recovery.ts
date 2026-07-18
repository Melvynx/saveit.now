import { useAction } from "convex/react";
import { useEffect } from "react";

import { api } from "@convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  finishTransaction,
  getAvailableProPurchases,
  isIapAvailable,
} from "../purchases";

const recoveredUserIds = new Set<string>();
const recoveryAttempts = new Map<string, symbol>();

export function useIapRecovery() {
  const { isAuthenticated, user } = useAuth();
  const syncFromClient = useAction(api.appstore.actions.syncFromClient);

  useEffect(() => {
    const userId = isAuthenticated ? (user?.id ?? null) : null;

    if (!userId) return;

    if (
      !isIapAvailable() ||
      recoveredUserIds.has(userId) ||
      recoveryAttempts.has(userId)
    ) {
      return;
    }

    let cancelled = false;
    const attempt = Symbol(userId);
    recoveryAttempts.set(userId, attempt);

    void (async () => {
      try {
        const purchases = await getAvailableProPurchases();
        if (cancelled) return;

        const uniquePurchases = [
          ...new Map(
            purchases.map((purchase) => [
              purchase.originalTransactionId,
              purchase,
            ]),
          ).values(),
        ];

        for (const purchase of uniquePurchases) {
          if (cancelled) return;

          try {
            await syncFromClient({
              originalTransactionId: purchase.originalTransactionId,
            });
            if (cancelled) return;
            await finishTransaction(purchase.purchase);
          } catch (error) {
            console.warn("[iap.recovery] failed to sync purchase", {
              originalTransactionId: purchase.originalTransactionId,
              error,
            });
          }
        }

        if (!cancelled) {
          recoveredUserIds.add(userId);
        }
      } catch (error) {
        console.warn("[iap.recovery] failed to recover purchases", { error });
      } finally {
        if (recoveryAttempts.get(userId) === attempt) {
          recoveryAttempts.delete(userId);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (recoveryAttempts.get(userId) === attempt) {
        recoveryAttempts.delete(userId);
      }
    };
  }, [isAuthenticated, syncFromClient, user?.id]);
}
