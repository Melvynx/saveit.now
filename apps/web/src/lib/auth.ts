import { prisma } from "@workspace/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { AUTH_PARAMS } from "./auth-params";
import { createBookmark } from "./database/create-bookmark";
import { inngest } from "./inngest/client";
import { logger } from "./logger";
import { stripeClient } from "./stripe";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    "saveit://*",
    "saveit://",
    "http://localhost:8081",
    "http://localhost:8081/*",
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 400, // 400 days - max allowed by cookies
    updateAge: 60 * 60 * 24, // Refresh session every day (extends to 400 days on each visit)
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create Stripe customer
          try {
            const stripeCustomer = await stripeClient.customers.create({
              email: user.email,
              name: user.name,
              metadata: {
                userId: user.id,
              },
            });

            await prisma.user.update({
              where: { id: user.id },
              data: { stripeCustomerId: stripeCustomer.id },
            });

            logger.info(
              `Created Stripe customer ${stripeCustomer.id} for user ${user.id}`,
            );
          } catch (error) {
            logger.error(
              "Failed to create Stripe customer for user:",
              user.id,
              error,
            );
          }

          // Create welcome bookmark
          try {
            await createBookmark({
              url: "https://saveit.now",
              userId: user.id,
            });
          } catch (error) {
            logger.error(
              "Failed to create welcome bookmark for user:",
              user.id,
              error,
            );
          }

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
  ...AUTH_PARAMS,
});
