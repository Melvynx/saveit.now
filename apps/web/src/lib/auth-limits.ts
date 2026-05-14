export type AuthLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  monthlyChatQueries: number;
  canExport: number;
  apiAccess: number;
};

export type CustomAuthLimits = Partial<AuthLimits>;

type AuthLimitsMetadata = unknown;

export const AUTH_LIMIT_KEYS = [
  "bookmarks",
  "monthlyBookmarkRuns",
  "monthlyChatQueries",
  "canExport",
  "apiAccess",
] as const satisfies readonly (keyof AuthLimits)[];

export const AUTH_LIMITS: Record<"pro" | "free", AuthLimits> = {
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
};

export const parseCustomAuthLimits = (
  metadata?: AuthLimitsMetadata,
): CustomAuthLimits => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const rawMetadata = metadata as { customLimits?: unknown };
  if (!rawMetadata.customLimits || typeof rawMetadata.customLimits !== "object") {
    return {};
  }

  const customLimits: CustomAuthLimits = {};
  const rawLimits = rawMetadata.customLimits as Record<string, unknown>;

  for (const key of AUTH_LIMIT_KEYS) {
    const value = rawLimits[key];
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Number.isInteger(value) &&
      value >= 0
    ) {
      customLimits[key] = value;
    }
  }

  return customLimits;
};

export const getAuthLimits = (
  subscription?: { plan?: string | null } | null,
  metadata?: AuthLimitsMetadata,
): AuthLimits => {
  const planLimits =
    AUTH_LIMITS[subscription?.plan as keyof typeof AUTH_LIMITS] ??
    AUTH_LIMITS.free;

  return {
    ...planLimits,
    ...parseCustomAuthLimits(metadata),
  };
};
