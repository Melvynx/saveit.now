export const ANALYTICS_EVENTS = {
  AUTH_SOCIAL_SIGN_IN_STARTED: "auth_social_sign_in_started",
  BOOKMARK_COPIED: "bookmark_link_copied",
  BOOKMARK_CREATED: "bookmark_created",
  BOOKMARK_DELETED: "bookmark_deleted",
  BOOKMARK_OPENED: "bookmark_opened",
  BOOKMARK_REPROCESSED: "bookmark_reprocessed",
  BOOKMARK_SHARED: "bookmark_shared",
  BOOKMARKS_EXPORTED: "bookmarks_exported",
  BOOKMARKS_IMPORTED: "bookmarks_imported",
  EXTENSION_INSTALL_CLICKED: "extension_install_clicked",
  IOS_DOWNLOAD_CLICKED: "ios_download_clicked",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SUBSCRIPTION_ACTIVATED: "subscription_activated",
  UPGRADE_CHECKOUT_STARTED: "upgrade_checkout_started",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<string, string | number | boolean>;

const GOOGLE_ANALYTICS_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  [ANALYTICS_EVENTS.ONBOARDING_COMPLETED]: "generate_lead",
  [ANALYTICS_EVENTS.UPGRADE_CHECKOUT_STARTED]: "begin_checkout",
  [ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED]: "purchase",
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    umami?: {
      track: (event: string, properties?: AnalyticsProperties) => void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAnalyticsEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
) {
  if (typeof window === "undefined") return;

  window.umami?.track(event, properties);

  const googleEvent = GOOGLE_ANALYTICS_EVENTS[event];
  if (googleEvent) {
    window.gtag?.("event", googleEvent, properties);
  }
}
