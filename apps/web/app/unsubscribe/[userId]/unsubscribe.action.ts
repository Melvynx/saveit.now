"use server";

import { action } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

export const unsubscribeUserAction = action
  .schema(
    z.object({
      userId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { userId } }) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, unsubscribed: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.unsubscribed) {
      return { success: true, message: "User is already unsubscribed" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { unsubscribed: true },
    });

    return { success: true, message: "Successfully unsubscribed from marketing emails" };
  });