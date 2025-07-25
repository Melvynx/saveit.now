import { sendMarketingEmail } from "@/lib/mail/send-marketing-email";
import { prisma } from "@workspace/database";
import { inngest } from "../client";
import { EMAILS } from "./emails.const";

export const marketingEmailsOnSubscriptionJob = inngest.createFunction(
  {
    id: "marketing-emails-on-subscription",
    concurrency: {
      key: "event.data.email",
      limit: 1,
    },
    onFailure: async ({ event, runId }) => {
      const data = event.data.event.data;
      const email = data.email;

      if (!email) {
        return;
      }

      // Log the error for debugging
      console.error("Subscription email job failed:", {
        email,
        error: event.data.error,
        runId,
      });
    },
  },
  { event: "user/subscription" },
  async ({ event, step }) => {
    const userId = event.data.userId;
    
    if (!userId) {
      throw new Error("User ID is required for marketing emails");
    }

    const user = await step.run("get-user", async () => {
      return await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    });

    const email = user?.email;

    if (!email) {
      throw new Error("User email is required");
    }

    await step.run("send-subscription-thank-you", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Welcome to SaveIt.pro !",
        text: EMAILS.SUBSCRIPTION_THANK_YOU_EMAIL,
        preview: "Thanks for your trust!",
      });
    });

    // Wait 1 day
    await step.sleep("wait-1-day-after-thank-you", "1d");

    // Email 2: How to use premium effectively
    await step.run("send-how-to-use-premium", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "How to use your premium effectively",
        text: EMAILS.SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL,
        preview: "How to use your premium effectively",
      });
    });

    // Wait 1 day
    await step.sleep("wait-1-day-after-premium-tips", "1d");

    // Email 3: Let's talk
    await step.run("send-lets-talk", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Let's talk? 💬",
        text: EMAILS.SUBSCRIPTION_LETS_TALK_EMAIL,
        preview: "Let's talk?",
      });
    });

    // Wait 1 day
    await step.sleep("wait-1-day-after-lets-talk", "1d");

    // Email 4: Our commitment
    await step.run("send-our-commitment", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Our commitment to you",
        text: EMAILS.SUBSCRIPTION_OUR_COMMITMENT_EMAIL,
        preview: "Our commitment to you",
      });
    });
  },
);
