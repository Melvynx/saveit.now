import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("trackAnalyticsEvent", () => {
  afterEach(() => {
    delete window.umami;
    delete window.gtag;
  });

  it("forwards SaveIt events and aggregate properties to Umami", () => {
    const track = vi.fn();
    window.umami = { track };

    trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARKS_IMPORTED, {
      bookmark_count: 12,
    });

    expect(track).toHaveBeenCalledWith("bookmarks_imported", {
      bookmark_count: 12,
    });
  });

  it("is a no-op while the tracker is unavailable", () => {
    expect(() =>
      trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_OPENED, {
        surface: "bookmark_card",
      }),
    ).not.toThrow();
  });

  it("maps acquisition and revenue events to Google Analytics standard events", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
      path: "import",
    });
    trackAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_CHECKOUT_STARTED, {
      billing_interval: "yearly",
    });
    trackAnalyticsEvent(ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED);

    expect(gtag).toHaveBeenNthCalledWith(1, "event", "generate_lead", {
      path: "import",
    });
    expect(gtag).toHaveBeenNthCalledWith(2, "event", "begin_checkout", {
      billing_interval: "yearly",
    });
    expect(gtag).toHaveBeenNthCalledWith(3, "event", "purchase", undefined);
  });
});
