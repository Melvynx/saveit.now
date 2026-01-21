"use server";

import { SafeActionError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";

const slugRegex = /^[a-z0-9-]+$/;

const UpdatePublicLinkSchema = z.object({
  enabled: z.boolean(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      slugRegex,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .optional()
    .nullable(),
});

export const updatePublicLinkAction = userAction
  .schema(UpdatePublicLinkSchema)
  .action(async ({ ctx: { user }, parsedInput: { enabled, slug } }) => {
    if (enabled && !slug) {
      throw new SafeActionError("Slug is required when enabling public link");
    }

    if (enabled && slug) {
      const existingUser = await prisma.user.findUnique({
        where: { publicLinkSlug: slug },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new SafeActionError("This slug is already taken");
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        publicLinkEnabled: enabled,
        publicLinkSlug: enabled ? slug : null,
      },
    });

    return { success: true };
  });
