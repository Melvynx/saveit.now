import { realtimeMiddleware } from "@inngest/realtime/middleware";
import { Inngest } from "inngest";

const realtimeEnabled = !process.env.CI;

const middleware = realtimeEnabled ? [realtimeMiddleware()] : [];

const baseInngest = new Inngest({
  id: "saveit.now",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: middleware as any,
  eventKey: process.env.INNGEST_EVENT_KEY || "missing-key",
});

export const inngest = new Proxy(baseInngest, {
  get(target, prop, receiver) {
    if (prop === "send") {
      return async (...args: Parameters<typeof baseInngest.send>) => {
        try {
          return await target.send(...args);
        } catch {
          // Inngest may not be available in dev/test/CI
        }
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});
