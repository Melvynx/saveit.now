import { prisma } from "@workspace/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { AUTH_PARAMS } from "./auth-params";
import { createBookmark } from "./database/create-bookmark";
import { inngest } from "./inngest/client";

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
    expiresIn: 60 * 60 * 24 * 20, // 20 days
    updateAge: 60 * 60 * 24 * 7, // Refresh session every 7 days
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await createBookmark({
              url: "https://saveit.now",
              userId: user.id,
            });
          } catch (error) {
            console.error(
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
