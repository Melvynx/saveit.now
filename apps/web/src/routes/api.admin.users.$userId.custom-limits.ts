import { AUTH_LIMIT_KEYS, type CustomAuthLimits } from "@/lib/auth-limits";
import { getUserMetadata } from "@/lib/database/user-metadata.utils";
import { adminRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import type { Prisma } from "@workspace/database";
import { prisma } from "@workspace/database/client";
import { z } from "zod";

const customLimitValueSchema = z.number().int().min(0).nullable().optional();

const paramsSchema = z.object({
  userId: z.string().min(1),
});

const bodySchema = z.object({
  bookmarks: customLimitValueSchema,
  monthlyBookmarkRuns: customLimitValueSchema,
  monthlyChatQueries: customLimitValueSchema,
  canExport: customLimitValueSchema,
  apiAccess: customLimitValueSchema,
});

const POST = adminRoute
  .params(paramsSchema)
  .body(bodySchema)
  .handler(async (_, { params, body }) => {
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const customLimits: CustomAuthLimits = {};
    for (const key of AUTH_LIMIT_KEYS) {
      const value = body[key];
      if (typeof value === "number") {
        customLimits[key] = value;
      }
    }

    const metadata = await getUserMetadata(params.userId);
    const nextMetadata = { ...metadata };
    if (Object.keys(customLimits).length > 0) {
      nextMetadata.customLimits = customLimits;
    } else {
      delete nextMetadata.customLimits;
    }

    await prisma.user.update({
      where: { id: params.userId },
      data: { metadata: nextMetadata as Prisma.InputJsonValue },
    });

    return { customLimits };
  });

export const Route = createFileRoute("/api/admin/users/$userId/custom-limits")({
  server: { handlers: { POST } },
});
