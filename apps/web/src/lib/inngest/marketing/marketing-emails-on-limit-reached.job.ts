import { env } from "@/lib/env";
import { sendEmail } from "@/lib/mail/send-email";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database";
import dayjs from "dayjs";
import MarkdownEmail from "emails/markdown.emails";
import { nanoid } from "nanoid";
import { inngest } from "../client";
import { EMAILS } from "./emails.const";

const generatePromoCode = () => {
  return nanoid(6).toUpperCase();
};

export const marketingEmailsOnLimitReachedJob = inngest.createFunction(
  {
    id: "marketing-emails-on-limit-reached",
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
      console.error("Limit reached email job failed:", {
        email,
        error: event.data.error,
        runId,
      });
    },
  },
  { event: "marketing/email-on-limit-reached" },
  async ({ event, step }) => {
    const userId = event.data.userId;

    const user = await step.run("get-user", async () => {
      if (!userId) return null;

      return await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          email: true,
          stripeCustomerId: true,
        },
      });
    });

    const email = user?.email;

    if (!email) {
      throw new Error("User email is required");
    }

    const promoCode = await step.run("create-promo-code", async () => {
      const code = generatePromoCode();

      const coupon = await stripeClient.promotionCodes.create({
        coupon: env.STRIPE_COUPON_ID,
        code,
        max_redemptions: 1,
        expires_at: dayjs().add(2, "days").unix(),
        customer: user?.stripeCustomerId ?? undefined,
        active: true,
        restrictions: {
          first_time_transaction: true,
        },
      });

      return code;
    });

    await step.run("send-limit-reached-discount", async () => {
      return await sendEmail({
        to: email,
        subject: "You reached your limit! Here's a special discount 🎁",
        text: EMAILS.LIMIT_REACHED_DISCOUNT_EMAIL(promoCode),
        html: MarkdownEmail({
          markdown: EMAILS.LIMIT_REACHED_DISCOUNT_EMAIL(promoCode),
          preview: "You reached your limit! Here's a special discount",
        }),
      });
    });

    await step.sleep("wait-1-day-after-discount", "1d");

    await step.run("send-discount-reminder", async () => {
      return await sendEmail({
        to: email,
        subject: "Don't forget your $1 discount! 💰",
        text: EMAILS.LIMIT_REACHED_REMINDER_EMAIL(promoCode),
        html: MarkdownEmail({
          markdown: EMAILS.LIMIT_REACHED_REMINDER_EMAIL(promoCode),
          preview: "Don't forget your $1 discount!",
        }),
      });
    });

    await step.sleep("wait-1-day-after-reminder", "1d");

    await step.run("send-last-chance", async () => {
      return await sendEmail({
        to: email,
        subject: "Last chance: $1 deal expires today! ⏰",
        text: EMAILS.LIMIT_REACHED_LAST_CHANCE_EMAIL(promoCode),
        html: MarkdownEmail({
          markdown: EMAILS.LIMIT_REACHED_LAST_CHANCE_EMAIL(promoCode),
          preview: "Last chance: $1 deal expires today!",
        }),
      });
    });
  },
);
