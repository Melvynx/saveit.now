import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "../generated/prisma";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../generated/prisma") as {
  PrismaClient: typeof PrismaClientType;
};

const globalForPrisma = global as unknown as { prisma: PrismaClientType };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
