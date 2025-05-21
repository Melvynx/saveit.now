/* eslint-disable no-console */
import { type Instrumentation } from "next";

// instrumentation.js
export function register() {
  // No-op for initialization
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPostHogClient } = require("./src/lib/posthog");
    const posthog = getPostHogClient();

    let distinctId = null;

    if (request.headers.cookie) {
      const cookieString = request.headers.cookie;
      const postHogCookieMatch =
        typeof cookieString === "string"
          ? cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
          : null;

      if (postHogCookieMatch?.[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          const postHogData = JSON.parse(decodedCookie);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          distinctId = (postHogData as any).distinct_id;
        } catch (e) {
          console.error("Error parsing PostHog cookie:", e);
        }
      }
    }

    await posthog.captureException(err, distinctId ?? undefined);
  }
};
