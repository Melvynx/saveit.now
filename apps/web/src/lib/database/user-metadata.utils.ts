import { prisma } from "@workspace/database/client";
import { z } from "zod";
import type { Prisma } from "@workspace/database";
import { AUTH_LIMIT_KEYS, type CustomAuthLimits } from "../auth-limits";

const CustomLimitsSchema = z
  .object(
    Object.fromEntries(
      AUTH_LIMIT_KEYS.map((key) => [key, z.number().int().min(0).optional()]),
    ) as Record<keyof CustomAuthLimits, z.ZodOptional<z.ZodNumber>>,
  )
  .partial();

const UserMetadataSchema = z.object({
  limitEmailSentAt: z.string().optional(),
  customLimits: CustomLimitsSchema.optional(),
}).passthrough();

export type UserMetadata = z.infer<typeof UserMetadataSchema>;

export const getUserMetadata = async (userId: string): Promise<UserMetadata> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metadata: true },
  });

  if (!user?.metadata) {
    return {};
  }

  const result = UserMetadataSchema.safeParse(user.metadata);
  return result.success ? result.data : {};
};

export const updateUserMetadata = async (
  userId: string,
  updates: Partial<UserMetadata>
): Promise<void> => {
  const currentMetadata = await getUserMetadata(userId);
  const updatedMetadata = { ...currentMetadata, ...updates };

  await prisma.user.update({
    where: { id: userId },
    data: { metadata: updatedMetadata as Prisma.InputJsonValue },
  });
};

export const setLimitEmailSent = async (userId: string): Promise<void> => {
  await updateUserMetadata(userId, {
    limitEmailSentAt: new Date().toISOString(),
  });
};

export const hasLimitEmailBeenSent = async (userId: string): Promise<boolean> => {
  const metadata = await getUserMetadata(userId);
  return !!metadata.limitEmailSentAt;
};
