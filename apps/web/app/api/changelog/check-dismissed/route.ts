import { userRoute } from "@/lib/safe-route";
import { isChangelogDismissed } from "@/lib/changelog/changelog-redis";
import { z } from "zod";

export const POST = userRoute
  .body(
    z.object({
      version: z.string().min(1),
    }),
  )
  .handler(async (req, { body, ctx }) => {
    const isDismissed = await isChangelogDismissed(ctx.user.id, body.version);
    
    return { isDismissed };
  });