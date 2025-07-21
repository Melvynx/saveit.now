import { AUTH_PARAMS } from "@/lib/auth-params";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrismaClient } from "./database-loader.mjs";

const prisma = getPrismaClient();

export const testAuth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  ...AUTH_PARAMS,
});
