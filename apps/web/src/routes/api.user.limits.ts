import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/user/limits")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [
          { getAuthLimits, parseCustomAuthLimits },
          { getUserMetadata },
          { requireUser },
          { prisma },
        ] = await Promise.all([
          import("@/lib/auth-limits"),
          import("@/lib/database/user-metadata.utils"),
          import("@/lib/safe-route"),
          import("@workspace/database/client"),
        ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const subscription = await prisma.subscription.findFirst({
          where: {
            referenceId: user.id,
            status: { in: ["active", "trialing"] },
          },
        });

        const metadata = await getUserMetadata(user.id);
        const limits = getAuthLimits(subscription, metadata);
        const plan = (subscription?.plan ?? "free") as "free" | "pro";

        return Response.json({
          plan,
          limits,
          customLimits: parseCustomAuthLimits(metadata),
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                periodEnd: subscription.periodEnd,
              }
            : null,
        });
      },
    },
  },
});
