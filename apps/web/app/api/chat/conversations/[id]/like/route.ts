import { updateConversationLikes } from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string(),
});

export const POST = userRoute
  .params(paramsSchema)
  .handler(async (req, { params, ctx }) => {
    await updateConversationLikes(params.id, ctx.user.id, 1);
    return NextResponse.json({ success: true });
  });
