import { inngest } from "@/lib/inngest/client";
import { batchMarketingEmailJob } from "@/lib/inngest/marketing/batch-marketing-email.job";
import { marketingEmailsOnLimitReachedJob } from "@/lib/inngest/marketing/marketing-emails-on-limit-reached.job";
import { marketingEmailsOnNewSubscriberJob } from "@/lib/inngest/marketing/marketing-emails-on-new-subscriber.job";
import { marketingEmailsOnSubscriptionJob } from "@/lib/inngest/marketing/marketing-emails-on-subscription.job";
import { processBookmarkJob } from "@/lib/inngest/process-bookmark.job";
import { createFileRoute } from "@tanstack/react-router";
import { serve } from "inngest/edge";

const handler = serve({
  client: inngest,
  functions: [
    processBookmarkJob,
    batchMarketingEmailJob,
    marketingEmailsOnLimitReachedJob,
    marketingEmailsOnSubscriptionJob,
    marketingEmailsOnNewSubscriberJob,
  ],
});

const inngestHandler = ({ request }: { request: Request }) => handler(request);

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: inngestHandler,
      POST: inngestHandler,
      PUT: inngestHandler,
    },
  },
});
