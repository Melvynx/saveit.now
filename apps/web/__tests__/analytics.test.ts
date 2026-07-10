import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("trackAnalyticsEvent", () => {
  afterEach(() => {
    delete window.umami;
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
});
