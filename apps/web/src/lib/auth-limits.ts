type AuthLimits = {
  bookmarks: number;
  monthlyBookmarks: number;
};

export const AUTH_LIMITS: Record<string, AuthLimits> = {
  free: {
    bookmarks: 20,
    monthlyBookmarks: 20,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarks: 1000,
  },
};

export const getAuthLimits = (
  subscription?: { plan?: string | null } | null
): AuthLimits => {
  return (AUTH_LIMITS[subscription?.plan as keyof typeof AUTH_LIMITS] ??
    AUTH_LIMITS.free) as AuthLimits;
};
