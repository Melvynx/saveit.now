import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "saveit.analytics-consent";

type AnalyticsConsent = "granted" | "denied" | undefined;

const CONSENT_MODE_DEFAULT = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

function readConsent(): AnalyticsConsent {
  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : undefined;
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<AnalyticsConsent>();

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  useEffect(() => {
    if (!measurementId || consent !== "granted") return;

    window.dataLayer ??= [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("consent", "default", CONSENT_MODE_DEFAULT);
    window.gtag("js", new Date());
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("config", measurementId, { send_page_view: true });

    if (
      document.head.querySelector(
        `script[data-google-analytics-id="${measurementId}"]`,
      )
    ) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.googleAnalyticsId = measurementId;
    document.head.appendChild(script);
  }, [consent, measurementId]);

  if (!measurementId || consent !== undefined) return null;

  const chooseConsent = (choice: Exclude<AnalyticsConsent, undefined>) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    setConsent(choice);
  };

  return (
    <section
      aria-label="Analytics preferences"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border bg-background p-4 shadow-xl sm:flex sm:items-center sm:gap-4"
    >
      <p className="text-sm leading-6 text-muted-foreground sm:flex-1">
        We use optional analytics to understand sign-ups, checkout, and paid
        subscriptions. <a className="underline underline-offset-4" href="/privacy">Learn more</a>
      </p>
      <div className="mt-3 flex gap-2 sm:mt-0">
        <button
          className="rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => chooseConsent("denied")}
          type="button"
        >
          Decline
        </button>
        <button
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => chooseConsent("granted")}
          type="button"
        >
          Accept analytics
        </button>
      </div>
    </section>
  );
}
