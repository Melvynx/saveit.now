import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/unsubscribe/$userId")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { prisma } = await import("@workspace/database/client");
        const user = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { id: true, email: true, unsubscribed: true },
        });

        if (!user) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }

        if (user.unsubscribed) {
          return Response.json({
            success: true,
            message: "User is already unsubscribed",
          });
        }

        await prisma.user.update({
          where: { id: params.userId },
          data: { unsubscribed: true },
        });

        return Response.json({
          success: true,
          message: "Successfully unsubscribed from marketing emails",
        });
      },
    },
  },
});
