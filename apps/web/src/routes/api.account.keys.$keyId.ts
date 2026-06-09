import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const updateApiKeySchema = z.object({
  name: z.string().trim().min(1, "Key name is required").max(255),
});

export const Route = createFileRoute("/api/account/keys/$keyId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const { name } = updateApiKeySchema.parse(await request.json());

        const result = await prisma.apikey.updateMany({
          where: {
            id: params.keyId,
            userId: user.id,
          },
          data: {
            name,
            updatedAt: new Date(),
          },
        });

        if (result.count === 0) {
          return Response.json({ error: "API key not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
