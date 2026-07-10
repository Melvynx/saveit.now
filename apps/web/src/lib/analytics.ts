export const ANALYTICS_EVENTS = {
  AUTH_SOCIAL_SIGN_IN_STARTED: "auth_social_sign_in_started",
  BOOKMARK_COPIED: "bookmark_link_copied",
  BOOKMARK_DELETED: "bookmark_deleted",
  BOOKMARK_OPENED: "bookmark_opened",
  BOOKMARK_REPROCESSED: "bookmark_reprocessed",
  BOOKMARK_SHARED: "bookmark_shared",
  BOOKMARKS_EXPORTED: "bookmarks_exported",
  BOOKMARKS_IMPORTED: "bookmarks_imported",
  IOS_DOWNLOAD_CLICKED: "ios_download_clicked",
  UPGRADE_CHECKOUT_STARTED: "upgrade_checkout_started",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, properties?: AnalyticsProperties) => void;
    };
  }
}

export function trackAnalyticsEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
) {
  if (typeof window === "undefined") return;

  window.umami?.track(event, properties);
}
