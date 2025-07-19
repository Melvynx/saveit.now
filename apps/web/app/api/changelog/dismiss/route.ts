import { userRoute } from "@/lib/safe-route";
import { markChangelogAsDismissed } from "@/lib/changelog/changelog-redis";
import { z } from "zod";

export const POST = userRoute
  .body(
    z.object({
      version: z.string().min(1),
    }),
  )
  .handler(async (req, { body, ctx }) => {
    await markChangelogAsDismissed(ctx.user.id, body.version);
    
    return { success: true };
  });