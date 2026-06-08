import { updateConversationLikes } from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const POST = userRoute
  .params(z.object({ id: z.string() }))
  .handler(async (_, { params, ctx }) => {
    await updateConversationLikes(params.id, ctx.user.id, -1);
    return { success: true };
  });

export const Route = createFileRoute("/api/chat/conversations/$id/dislike")({
  server: { handlers: { POST } },
});
