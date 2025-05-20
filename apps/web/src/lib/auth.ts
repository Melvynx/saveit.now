import { stripe } from "@better-auth/stripe";
import { prisma } from "@workspace/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { resend } from "./resend";
import { stripeClient } from "./stripe";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    stripe({
      stripeClient: stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      plans: [
        {
          name: "free", // the name of the plan, it'll be automatically lower cased when stored in the database
          priceId: "price_1234567890", // the price ID from stripe
          annualDiscountPriceId: "price_1234567890", // (optional) the price ID for annual billing with a discount
          limits: {
            bookmarks: 20,
            monthlyBookmarks: 20,
          },
        },
        {
          name: "pro",
          priceId: "price_0987654321",
          limits: {
            bookmarks: 50000,
            monthlyBookmarks: 1000,
          },
          freeTrial: {
            days: 14,
          },
        },
      ],
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
  ],
});
