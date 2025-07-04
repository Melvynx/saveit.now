export type AuthLimits = {
  bookmarks: number;
  monthlyBookmarks: number;
  canExport: number;
};

export const AUTH_LIMITS: Record<"pro" | "free", AuthLimits> = {
  free: {
    bookmarks: 20,
    monthlyBookmarks: 20,
    canExport: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarks: 3000,
    canExport: 1,
  },
};

export const getAuthLimits = (
  subscription?: { plan?: string | null } | null,
): AuthLimits => {
  return (AUTH_LIMITS[subscription?.plan as keyof typeof AUTH_LIMITS] ??
    AUTH_LIMITS.free) as AuthLimits;
};
