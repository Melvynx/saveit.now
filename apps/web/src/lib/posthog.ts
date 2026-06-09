import { PostHog } from "posthog-node";

const noopPostHogClient = {
  capture: () => undefined,
  shutdown: async () => undefined,
} as Pick<PostHog, "capture" | "shutdown">;

export function getPostHogClient() {
  const apiKey =
    process.env.VITE_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    return noopPostHogClient;
  }

  const posthogClient = new PostHog(apiKey, {
    host:
      process.env.VITE_POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}
