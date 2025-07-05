import { stripe } from "@better-auth/stripe";

import { prisma } from "@workspace/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP, magicLink } from "better-auth/plugins";
import { AUTH_LIMITS } from "./auth-limits";
import { inngest } from "./inngest/client";
import { resend } from "./resend";
import { getServerUrl } from "./server-url";
import { stripeClient } from "./stripe";

export const auth = betterAuth({
  baseURL: getServerUrl(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url, token }, request) => {
        await resend.emails.send({
          from: "noreply@codeline.app",
          to: user.email, // verification email must be sent to the current user email to approve the change
          subject: "Approve email change",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; text-align: center;">Email Change Request</h2>
              <p>Hello,</p>
              <p>You requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Approve Email Change</a>
              </div>
              <p style="color: #666; font-size: 14px;">If you didn't request this change, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">Best regards,<br>The SaveIt.now Team</p>
            </div>
          `,
          text: `Hello,\n\nYou requested to change your email address from ${user.email} to ${newEmail}.\n\nClick the link below to approve this change:\n${url}\n\nIf you didn't request this change, please ignore this email.\n\nBest regards,\nThe SaveIt.now Team`,
        });
      },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const stripeCustomer = await stripeClient.customers.retrieve(user.id);
        if (!stripeCustomer) return;

        const subscriptions = await stripeClient.subscriptions.list({
          customer: stripeCustomer.id,
        });
        if (!subscriptions.data.length) return;

        await Promise.all(
          subscriptions.data.map((subscription) =>
            stripeClient.subscriptions.cancel(subscription.id),
          ),
        );
      },
      afterDelete: async (user) => {
        await resend.emails.send({
          from: "noreply@codeline.app",
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
        await resend.emails.send({
          from: "noreply@codeline.app",
          to: user.email,
          subject: "Verify Deletion",
          text: `Click here to delete your account: ${url}`,
        });
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          inngest.send({
            name: "user/new-subscriber",
            data: {
              userId: user.id,
            },
          });
        },
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
      async sendVerificationOTP({ email, otp }) {
        // Implement email sending here
        // Example with Resend, Nodemailer, etc.
        await resend.emails.send({
          to: email,
          subject: "Your verification code",
          html: `Your OTP code is: <strong>${otp}</strong>`,
          from: "noreply@codeline.app",
        });
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
    stripe({
      stripeClient: stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        async getCheckoutSessionParams() {
          return {
            params: {
              allow_promotion_codes: true,
            },
          };
        },
        async onSubscriptionComplete(data) {
          inngest.send({
            name: "user/subscription",
            data: {
              userId: data.subscription.referenceId,
            },
          });
        },
        plans: [
          {
            name: "free",
            limits: AUTH_LIMITS.free,
          },
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
            annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
            limits: AUTH_LIMITS.pro,
          },
        ],
      },
    }),
    magicLink({
      async sendMagicLink(data) {
        await resend.emails.send({
          from: "noreply@codeline.app",
          to: data.email,
          subject: "Magic Link",
          text: `Click here to login: ${data.url}`,
        });
      },
    }),
    nextCookies(),
    admin({}),
  ],
});
