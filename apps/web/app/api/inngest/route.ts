import { inngest } from "@/lib/inngest/client";
import { processBookmarkJob } from "@/lib/inngest/process-bookmark.job";
import { serve } from "inngest/next";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processBookmarkJob],
});
