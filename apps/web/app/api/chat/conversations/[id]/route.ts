import {
  deleteConversation,
  getConversation,
  updateConversationMessages,
  updateConversationTitle,
} from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string(),
});

const patchSchema = z.object({
  title: z.string().optional(),
  messages: z.array(z.any()).optional(),
});

export const GET = userRoute
  .params(paramsSchema)
  .handler(async (req, { params, ctx }) => {
    const conversation = await getConversation(params.id, ctx.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ conversation });
  });

export const PATCH = userRoute
  .params(paramsSchema)
  .body(patchSchema)
  .handler(async (req, { params, body, ctx }) => {
    const conversation = await getConversation(params.id, ctx.user.id);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (body.title !== undefined) {
      await updateConversationTitle(params.id, ctx.user.id, body.title);
    }

    if (body.messages !== undefined) {
      await updateConversationMessages(params.id, ctx.user.id, body.messages);
    }

    return NextResponse.json({ success: true });
  });

export const DELETE = userRoute
  .params(paramsSchema)
  .handler(async (req, { params, ctx }) => {
    await deleteConversation(params.id, ctx.user.id);
    return NextResponse.json({ success: true });
  });
