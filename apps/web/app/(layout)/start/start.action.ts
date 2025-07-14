"use server";

import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const finishOnboardingAction = userAction
  .schema(z.object({}))
  .action(async ({ ctx: { user } }) => {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboarding: true },
    });
    return { success: true };
  });
