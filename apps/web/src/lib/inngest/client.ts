import { realtimeMiddleware } from "@inngest/realtime";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "saveit.now",
  middleware: [realtimeMiddleware()],
  eventKey: process.env.INNGEST_EVENT_KEY,
});
