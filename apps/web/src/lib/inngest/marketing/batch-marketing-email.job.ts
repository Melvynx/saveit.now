import { getServerUrl } from "@/lib/server-url";
import { sendEmail } from "@/lib/mail/send-email";
import { getMarketingEligibleUsers, MarketingEligibleUser } from "@/lib/database/marketing-users";
import MarkdownEmail from "emails/markdown.emails";
import { inngest } from "../client";

interface BatchEmailEvent {
  subject: string;
  subheadline: string;
  markdown: string;
}

const BATCH_SIZE = 100;
const BATCH_DELAY = "1s";

/**
 * Adds unsubscribe link to markdown content
 */
const addUnsubscribeLink = (content: string, userId: string): string => {
  const unsubscribeUrl = `${getServerUrl()}/unsubscribe/${userId}`;
  const unsubscribeText = `\n\n---\n\n[Unsubscribe from marketing emails](${unsubscribeUrl})`;
  
  return content + unsubscribeText;
};

/**
 * Sends an individual marketing email to a user
 */
const sendMarketingEmailToUser = async (user: MarketingEligibleUser, subject: string, subheadline: string, markdown: string) => {
  const markdownWithUnsubscribe = addUnsubscribeLink(markdown, user.id);
  
  return await sendEmail({
    from: "Melvyn from SaveIt.now <help@re.saveit.now>",
    to: user.email,
    subject,
    text: markdownWithUnsubscribe,
    html: MarkdownEmail({
      markdown: markdownWithUnsubscribe,
      preview: subheadline,
    }),
  });
};

/**
 * Splits array into chunks of specified size
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const batchMarketingEmailJob = inngest.createFunction(
  {
    id: "batch-marketing-email",
    concurrency: {
      key: "event.data.subject", // Only one batch campaign at a time per subject
      limit: 1,
    },
    onFailure: async ({ event, runId }) => {
      console.error("Batch marketing email job failed:", {
        subject: event.data.event.data.subject,
        error: event.data.error,
        runId,
      });
      
      // Could add email notification to admin here
    },
  },
  { event: "marketing/batch-email" },
  async ({ event, step }) => {
    const { subject, subheadline, markdown } = event.data as BatchEmailEvent;

    if (!subject || !subheadline || !markdown) {
      throw new Error("Subject, subheadline, and markdown are required for batch email");
    }

    // Get all eligible users
    const users = await step.run("get-eligible-users", async () => {
      return await getMarketingEligibleUsers();
    });

    if (users.length === 0) {
      console.log("No eligible users found for batch email");
      return { success: true, message: "No eligible users found" };
    }

    // Split users into batches
    const batches = chunkArray(users, BATCH_SIZE);
    console.log(`Sending batch email to ${users.length} users in ${batches.length} batches`);

    // Send batches with delays
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (!batch) continue;
      
      const batchNumber = i + 1;
      
      await step.run(`send-batch-${batchNumber}`, async () => {
        // Send emails to all users in this batch
        const results = await Promise.all(
          batch.map(user => 
            sendMarketingEmailToUser(user, subject, subheadline, markdown)
          )
        );
        
        // Check for any errors
        const failedResult = results.find(r => r.error);
        if (failedResult?.error) {
          throw new Error(`Batch ${batchNumber} failed: ${failedResult.error.message}`);
        }

        console.log(`Batch ${batchNumber}/${batches.length} sent successfully to ${batch.length} recipients`);
        
        return {
          batchNumber,
          totalBatches: batches.length,
          recipientsInBatch: batch.length,
          success: true,
        };
      });

      // Wait between batches (except for the last batch)
      if (i < batches.length - 1) {
        await step.sleep(`wait-after-batch-${batchNumber}`, BATCH_DELAY);
      }
    }

    return {
      success: true,
      totalRecipients: users.length,
      totalBatches: batches.length,
      subject,
    };
  }
);