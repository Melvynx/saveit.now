"use server";

import { AUTH_LIMIT_KEYS, type CustomAuthLimits } from "@/lib/auth-limits";
import { getUserMetadata } from "@/lib/database/user-metadata.utils";
import { SafeActionError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma, type Prisma } from "@workspace/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CustomLimitValueSchema = z.number().int().min(0).nullable().optional();

export const updateCustomLimitsAction = userAction
  .schema(
    z.object({
      userId: z.string().min(1),
      bookmarks: CustomLimitValueSchema,
      monthlyBookmarkRuns: CustomLimitValueSchema,
      monthlyChatQueries: CustomLimitValueSchema,
      canExport: CustomLimitValueSchema,
      apiAccess: CustomLimitValueSchema,
    }),
  )
  .action(async ({ ctx: { user }, parsedInput }) => {
    if (user.role !== "admin") {
      throw new SafeActionError("Admin access required");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsedInput.userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new SafeActionError("User not found");
    }

    const customLimits: CustomAuthLimits = {};

    for (const key of AUTH_LIMIT_KEYS) {
      const value = parsedInput[key];
      if (typeof value === "number") {
        customLimits[key] = value;
      }
    }

    const metadata = await getUserMetadata(parsedInput.userId);
    const nextMetadata = { ...metadata };

    if (Object.keys(customLimits).length > 0) {
      nextMetadata.customLimits = customLimits;
    } else {
      delete nextMetadata.customLimits;
    }

    await prisma.user.update({
      where: { id: parsedInput.userId },
      data: { metadata: nextMetadata as Prisma.InputJsonValue },
    });

    revalidatePath(`/admin/users/${parsedInput.userId}`);

    return { customLimits };
  });
