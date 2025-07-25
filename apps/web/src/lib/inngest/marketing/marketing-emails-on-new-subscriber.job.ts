import { sendMarketingEmail } from "@/lib/mail/send-marketing-email";
import { prisma } from "@workspace/database";
import { inngest } from "../client";
import { EMAILS } from "./emails.const";

export const marketingEmailsOnNewSubscriberJob = inngest.createFunction(
  {
    id: "marketing-emails-on-new-subscriber",
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
      console.error("Marketing email job failed:", {
        email,
        error: event.data.error,
        runId,
      });
    },
  },
  { event: "user/new-subscriber" },
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
        select: {
          email: true,
        },
      });
    });

    const email = user?.email;
    if (!email) {
      throw new Error("User email is required");
    }

    await step.run("send-welcome-email", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Welcome to SaveIt.now (from Melvyn)",
        text: EMAILS.WELCOME_EMAIL,
        preview: "Just a quick note to say welcome to SaveIt.now",
      });
    });

    await step.sleep("wait-2-hours", "2h");

    const isChromeExtensionInstalled = await step.run(
      "check-chrome-extension-installed",
      async () => {
        if (!userId) return false;

        const extensionBookmarks = await prisma.bookmark.count({
          where: {
            userId: userId,
          },
        });

        return extensionBookmarks > 0;
      },
    );

    if (!isChromeExtensionInstalled) {
      await step.run("send-chrome-extension-email", async () => {
        return await sendMarketingEmail({
          userId,
          to: email,
          subject: "Install the SaveIt.now Chrome Extension",
          text: EMAILS.CHROME_EXTENSION_EMAIL,
          preview: "Install the SaveIt.now Chrome Extension",
        });
      });

      await step.sleep("wait-24h-after-extension", "24h");
    }

    await step.run("send-email-3", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Master the art of finding your bookmarks",
        text: EMAILS.HOW_USE_CHROME_EXTENSION_EMAIL,
        preview: "How to use the Chrome extension effectively",
      });
    });

    await step.sleep("wait-24h-after-extension", "24h");

    await step.run("how-to-import-bookmarks", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "How to import your bookmarks",
        text: EMAILS.HOW_TO_IMPORT_BOOKMARKS_EMAIL,
        preview: "How to import your existing bookmarks",
      });
    });

    await step.sleep("wait-24h-after-import-bookmarks", "24h");

    const bookmarkCount = await step.run("check-bookmark-count", async () => {
      if (!userId) return 0;

      return await prisma.bookmark.count({
        where: {
          userId: userId,
        },
      });
    });

    if (bookmarkCount < 10) {
      await step.run("send-how-to-use-bookmarks-email", async () => {
        return await sendMarketingEmail({
          userId,
          to: email,
          subject: "How to get the most out of your bookmarks",
          text: EMAILS.HOW_TO_USE_BOOKMARKS_EMAIL,
          preview: "Tips to get the most out of your bookmarks",
        });
      });

      await step.sleep("wait-24h-after-usage-tips", "24h");
    }

    await step.run("send-how-to-search-email", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "Master the art of finding your bookmarks",
        text: EMAILS.HOW_TO_SEARCH_BOOKMARKS_EMAIL,
        preview: "Master the art of finding your bookmarks",
      });
    });

    await step.sleep("wait-24h-before-premium", "24h");

    await step.run("send-premium-commitment-email", async () => {
      return await sendMarketingEmail({
        userId,
        to: email,
        subject: "My commitment to SaveIt.now",
        text: EMAILS.PREMIUM_COMMITMENT_EMAIL,
        preview: "My commitment to SaveIt.now",
      });
    });
  },
);
