import { isChangelogDismissed } from "@/lib/changelog/changelog-redis";
import { userRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const POST = userRoute
  .body(z.object({ version: z.string().min(1) }))
  .handler(async (_, { body, ctx }) => {
    const isDismissed = await isChangelogDismissed(ctx.user.id, body.version);
    return { isDismissed };
  });

export const Route = createFileRoute("/api/changelog/check-dismissed")({
  server: { handlers: { POST } },
});
