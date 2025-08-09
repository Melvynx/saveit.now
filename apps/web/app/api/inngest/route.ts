import { inngest } from "@/lib/inngest/client";
import { batchMarketingEmailJob } from "@/lib/inngest/marketing/batch-marketing-email.job";
import { marketingEmailsOnLimitReachedJob } from "@/lib/inngest/marketing/marketing-emails-on-limit-reached.job";
import { marketingEmailsOnNewSubscriberJob } from "@/lib/inngest/marketing/marketing-emails-on-new-subscriber.job";
import { marketingEmailsOnSubscriptionJob } from "@/lib/inngest/marketing/marketing-emails-on-subscription.job";
import { processBookmarkJob } from "@/lib/inngest/process-bookmark.job";
import { serve } from "inngest/next";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processBookmarkJob,
    batchMarketingEmailJob,
    marketingEmailsOnLimitReachedJob,
    marketingEmailsOnSubscriptionJob,
    marketingEmailsOnNewSubscriberJob,
  ],
});
