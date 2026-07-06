const getPublicEnv = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
};

export const mobileConfig = {
  apiUrl: getPublicEnv(process.env.EXPO_PUBLIC_API_URL, "https://beta.saveit.now"),
  convexUrl: getPublicEnv(
    process.env.EXPO_PUBLIC_CONVEX_URL,
    "https://charming-spider-722.convex.cloud",
  ),
  convexSiteUrl: getPublicEnv(
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
    "https://charming-spider-722.convex.site",
  ),
  revenueCatIosApiKey: getPublicEnv(
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    "",
  ),
};
