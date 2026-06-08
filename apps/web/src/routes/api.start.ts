import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ requireUser }, { prisma }] = await Promise.all([
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        await prisma.user.update({
          where: { id: user.id },
          data: { onboarding: true },
        });

        return Response.json({ success: true });
      },
    },
  },
});
