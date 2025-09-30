export type AuthLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  canExport: number;
  apiAccess: number;
};

export const AUTH_LIMITS: Record<"pro" | "free", AuthLimits> = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    canExport: 1,
    apiAccess: 1,
  },
};

export const getAuthLimits = (
  subscription?: { plan?: string | null } | null,
): AuthLimits => {
  return (AUTH_LIMITS[subscription?.plan as keyof typeof AUTH_LIMITS] ??
    AUTH_LIMITS.free) as AuthLimits;
};
