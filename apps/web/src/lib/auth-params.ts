import { BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, apiKey, emailOTP, magicLink } from "better-auth/plugins";
import MarkdownEmail from "emails/markdown.emails";
import { sendEmail } from "./mail/send-email";
import { getServerUrl } from "./server-url";
import { stripeClient } from "./stripe";
import { logger } from "./logger";

export const AUTH_PARAMS = {
  baseURL: getServerUrl(),
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        const markdown = `You requested to change your email address from ${user.email} to ${newEmail}.

Click the link below to approve this change:
[Approve email change](${url})

If you didn't request this change, please ignore this email.`;
        await sendEmail({
          to: user.email,
          subject: "Approve email change",
          text: markdown,
          html: MarkdownEmail({
            markdown,
            preview: "Approve your email change",
          }),
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        try {
          const stripeCustomer = await stripeClient.customers.retrieve(user.id);
          if (!stripeCustomer || stripeCustomer.deleted) return;

          const subscriptions = await stripeClient.subscriptions.list({
            customer: stripeCustomer.id,
          });
          if (!subscriptions.data.length) return;

          await Promise.all(
            subscriptions.data.map((subscription) =>
              stripeClient.subscriptions.cancel(subscription.id),
            ),
          );
        } catch (error) {
          // If customer doesn't exist in Stripe, that's fine - just continue with deletion
          logger.debug(
            "Stripe customer not found during user deletion:",
            error,
          );
        }
      },
      afterDelete: async (user) => {
        const markdown = `It's Melvyn, the founder of SaveIt.now.

I'm sending you this email to confirm that your account has been permanently deleted.

If you have any questions, feel free to reach out at help@saveit.now.`;
        await sendEmail({
          to: user.email,
          subject: "Account Deleted",
          text: markdown,
          html: MarkdownEmail({
            markdown,
            preview: "Your account has been deleted",
          }),
        });
      },
      sendDeleteAccountVerification: async ({
        user,
        url,
      }) => {
        const markdown = `You requested to delete your account.

Click the link below to confirm the deletion:
[Delete my account](${url})

If you didn't request this, please ignore this email.`;
        await sendEmail({
          to: user.email,
          subject: "Verify Deletion",
          text: markdown,
          html: MarkdownEmail({
            markdown,
            preview: "Confirm your account deletion",
          }),
        });
      },
    },
    additionalFields: {
      onboarding: {
        type: "boolean",
        defaultValue: false,
        required: true,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  advanced: {
    cookiePrefix: "save-it",
  },
  plugins: [
    emailOTP({
      generateOTP(data) {
        // For App Store review, we need to generate a fixed OTP
        if (data.email === "help@saveit.now") {
          return "123456";
        }
        // Generate a 6-digit OTP by ensuring the number is between 100000 and 999999
        return Math.floor(100000 + Math.random() * 900000).toString();
      },
      async sendVerificationOTP({ email, otp }) {
        logger.info(`OTP code for ${email}: ${otp}`);
        const markdown = `Your verification code is:

**${otp}**

This code expires in 5 minutes. If you didn't request this, please ignore this email.`;
        await sendEmail({
          to: email,
          subject: `SaveIt.now - ${otp} is your verification code`,
          text: markdown,
          html: MarkdownEmail({
            markdown,
            preview: `Your verification code is ${otp}`,
            disabledSignature: true,
          }),
        });
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
    magicLink({
      async sendMagicLink(data) {
        const markdown = `Click the link below to sign in to SaveIt.now:

[Sign in to SaveIt.now](${data.url})

This link expires in 10 minutes. If you didn't request this, please ignore this email.`;
        await sendEmail({
          to: data.email,
          subject: "Sign in to SaveIt.now",
          text: markdown,
          html: MarkdownEmail({
            markdown,
            preview: "Sign in to SaveIt.now",
            disabledSignature: true,
          }),
        });
      },
    }),
    nextCookies(),
    admin({}),
    apiKey({
      rateLimit: {
        enabled: false,
      },
    }),
  ],
} satisfies BetterAuthOptions;
