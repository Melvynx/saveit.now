import { stripe } from "@better-auth/stripe";
import { prisma } from "@workspace/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { resend } from "./resend";
import { stripeClient } from "./stripe";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
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
      sendDeleteAccountVerification: async (
        {
          user, // The user object
          url, // The auto-generated URL for deletion
          token, // The verification token  (can be used to generate custom URL)
        },
        request, // The original request object (optional)
      ) => {
        await resend.emails.send({
          from: "noreply@codeline.app",
          to: user.email,
          subject: "Verify Deletion",
          text: `Click here to delete your account: ${url}`,
        });
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
    stripe({
      stripeClient: stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,

      subscription: {
        enabled: true,
        async getCheckoutSessionParams(data, request) {
          return {
            params: {
              allow_promotion_codes: true,
            },
          };
        },
        plans: [
          {
            name: "free",
            limits: {
              bookmarks: 20,
              monthlyBookmarks: 20,
            },
          },
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
            annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
            limits: {
              bookmarks: 50000,
              monthlyBookmarks: 1000,
            },
          },
        ],
      },
    }),
    magicLink({
      async sendMagicLink(data, request) {
        await resend.emails.send({
          from: "noreply@codeline.app",
          to: data.email,
          subject: "Magic Link",
          text: `Click here to login: ${data.url}`,
        });
      },
    }),
    nextCookies(),
  ],
});
