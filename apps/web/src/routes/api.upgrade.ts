import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const upgradeSchema = z.object({
  plan: z.string(),
  annual: z.boolean().default(false),
  successUrl: z.string(),
  cancelUrl: z.string(),
});

export const Route = createFileRoute("/api/upgrade")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ createUpgradeCheckoutSession }, { requireUser }] =
          await Promise.all([
            import("@/features/upgrade/upgrade-api"),
            import("@/lib/safe-route"),
          ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        try {
          const input = upgradeSchema.parse(await request.json());
          const url = await createUpgradeCheckoutSession({
            userId: user.id,
            ...input,
          });

          return Response.json({ url });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to create checkout session",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
