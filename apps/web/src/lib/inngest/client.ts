import { Inngest } from "inngest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const middleware: any[] = [];

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { realtimeMiddleware } = require("@inngest/realtime");
  if (process.env.NODE_ENV === "production" && !process.env.CI) {
    middleware.push(realtimeMiddleware());
  }
} catch {
  // @inngest/realtime not available
}

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
