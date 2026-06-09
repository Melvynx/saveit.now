import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const slugRegex = /^[a-z0-9-]+$/;

const updatePublicLinkSchema = z.object({
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

export const Route = createFileRoute("/api/user/public-link")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { enabled, slug } = updatePublicLinkSchema.parse(await request.json());
        if (enabled && !slug) {
          return Response.json(
            { error: "Slug is required when enabling public link" },
            { status: 400 },
          );
        }

        if (enabled && slug) {
          const existingUser = await prisma.user.findUnique({
            where: { publicLinkSlug: slug },
            select: { id: true },
          });

          if (existingUser && existingUser.id !== user.id) {
            return Response.json(
              { error: "This slug is already taken" },
              { status: 400 },
            );
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            publicLinkEnabled: enabled,
            publicLinkSlug: enabled ? slug : null,
          },
        });

        return Response.json({ success: true });
      },
    },
  },
});
