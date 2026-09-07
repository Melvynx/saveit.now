/**
 * billing/plans.ts — Plan limits constants and helpers.
 * Default runtime (no "use node").
 *
 * This is the single source of truth for plan limits. No Convex function
 * registrations live here — pure TypeScript helpers imported by other modules.
 */

// AUTH_LIMIT_KEYS — keys used for custom limit overrides via user metadata.
export const AUTH_LIMIT_KEYS = [
  "bookmarks",
  "monthlyBookmarkRuns",
  "monthlyChatQueries",
  "canExport",
  "apiAccess",
] as const;

// PLANS — verbatim plan limits (must not be changed without updating all limit checks).
// canExport and apiAccess are numeric flags: === 0 means denied, !== 0 means allowed.
export const PLANS = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,
    canExport: 1,
    apiAccess: 1,
  },
} as const;

export type PlanName = keyof typeof PLANS;
export type SubscriptionPlanState = {
  plan?: string | null;
  provider?: "stripe" | "appstore" | "manual" | null;
  status?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  _creationTime?: number | null;
};
// Plain numeric shape (NOT the `as const` literal union) so merged/custom
// limits and runtime-computed values assign cleanly.
export type PlanLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  monthlyChatQueries: number;
  canExport: number;
  apiAccess: number;
};

// Recognizes billing-provider access plus explicit manual lifetime grants.
export function isActiveSubscriptionStatus(
  status: string | null | undefined,
  provider?: "stripe" | "appstore" | "manual" | null,
): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    (provider === "appstore" && status === "past_due") ||
    (provider === "manual" && status === "lifetime")
  );
}

export function isLifetimeSubscription(
  subscription: SubscriptionPlanState | null | undefined,
): boolean {
  return (
    subscription?.plan === "pro" &&
    subscription.provider === "manual" &&
    subscription.status === "lifetime"
  );
}

/**
 * Pick the single subscription row that should drive entitlements.
 *
 * Migration and provider-transition windows can leave more than one row per
 * user. Never use the first row from the by_user index for authorization: it is
 * usually the oldest row and can incorrectly preserve an old active Pro grant.
 * Manual lifetime grants are intentionally durable; otherwise the most recently
 * updated/created row is canonical.
 */
export function pickCanonicalSubscription<
  T extends SubscriptionPlanState | null | undefined,
>(subscriptions: readonly T[]): T | null {
  const rows = subscriptions.filter(
    (subscription): subscription is NonNullable<T> => Boolean(subscription),
  );
  if (rows.length === 0) return null;

  const lifetime = rows.find((subscription) =>
    isLifetimeSubscription(subscription),
  );
  if (lifetime) return lifetime;

  return rows.reduce((newest, candidate) => {
    const newestTimestamp =
      newest.updatedAt ?? newest.createdAt ?? newest._creationTime ?? 0;
    const candidateTimestamp =
      candidate.updatedAt ?? candidate.createdAt ?? candidate._creationTime ?? 0;
    return candidateTimestamp > newestTimestamp ? candidate : newest;
  });
}

/**
 * Derive the effective entitlement from the canonical subscription row.
 * A stored plan name or an active-looking status alone must never grant Pro.
 */
export function deriveEffectivePlan(
  subscription: SubscriptionPlanState | null | undefined,
): PlanName {
  return subscription?.plan === "pro" &&
    isActiveSubscriptionStatus(subscription.status, subscription.provider)
    ? "pro"
    : "free";
}

/**
 * parseCustomLimits — extracts `metadata.customLimits`; validates each key.
 * Non-conforming values are silently dropped.
 * Returns `Partial<PlanLimits>`.
 */
export function parseCustomLimits(metadata: unknown): Partial<PlanLimits> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const rawMetadata = metadata as Record<string, unknown>;
  const rawCustomLimits = rawMetadata.customLimits;

  if (
    !rawCustomLimits ||
    typeof rawCustomLimits !== "object" ||
    Array.isArray(rawCustomLimits)
  ) {
    return {};
  }

  const customLimits: Partial<PlanLimits> = {};
  const limits = rawCustomLimits as Record<string, unknown>;

  for (const key of AUTH_LIMIT_KEYS) {
    const value = limits[key];
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Number.isInteger(value) &&
      value >= 0
    ) {
      (customLimits as Record<string, number>)[key] = value;
    }
  }

  return customLimits;
}

/**
 * getLimits — merges `PLANS[plan]` with `parseCustomLimits(metadata)`.
 * Custom limits always override plan limits (admin-configurable per-user override).
 */
export function getLimits(
  plan: "free" | "pro",
  metadata?: unknown,
): PlanLimits {
  const planLimits = PLANS[plan] ?? PLANS.free;
  return {
    ...planLimits,
    ...parseCustomLimits(metadata),
  };
}
