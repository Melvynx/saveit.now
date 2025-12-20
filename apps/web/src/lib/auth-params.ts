import { BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, apiKey, emailOTP, magicLink } from "better-auth/plugins";
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
        await sendEmail({
          to: user.email, // verification email must be sent to the current user email to approve the change
          subject: "Approve email change",
          text: `Hello,

You requested to change your email address from ${user.email} to ${newEmail}.

Click the link below to approve this change:
${url}

If you didn't request this change, please ignore this email.

Best regards,
The SaveIt.now Team`,
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
        await sendEmail({
          to: user.email,
          subject: "Account Deleted",
          text: `Hello, it's Melvyn the found of SaveIt.now.
        
I sent you a quick e-mail to confirm you that your account has been permanently deleted.

If you have any questions, please don't hesitate to contact me at melvyn@saveit.now.

Best regards,
Melvyn`,
        });
      },
      sendDeleteAccountVerification: async ({
        user, // The user object
        url, // The auto-generated URL for deletion
      }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify Deletion",
          text: `Click here to delete your account: ${url}`,
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
        await sendEmail({
          to: email,
          subject: `SaveIt.now - ${otp} is your verification code`,
          html: `Your OTP code is: <strong>${otp}</strong>`,
        });
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
    magicLink({
      async sendMagicLink(data) {
        await sendEmail({
          to: data.email,
          subject: "Magic Link",
          text: `Click here to login: ${data.url}`,
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
