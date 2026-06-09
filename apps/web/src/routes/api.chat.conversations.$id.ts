import {
  deleteConversation,
  getConversation,
  updateConversationMessages,
  updateConversationTitle,
} from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string() });
const patchSchema = z.object({
  title: z.string().optional(),
  messages: z.array(z.any()).optional(),
});

const GET = userRoute
  .params(paramsSchema)
  .handler(async (_, { params, ctx }) => {
    const conversation = await getConversation(params.id, ctx.user.id);

    if (!conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return { conversation };
  });

const PATCH = userRoute
  .params(paramsSchema)
  .body(patchSchema)
  .handler(async (_, { params, body, ctx }) => {
    const conversation = await getConversation(params.id, ctx.user.id);
    if (!conversation) {
      return Response.json(
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

    return { success: true };
  });

const DELETE = userRoute
  .params(paramsSchema)
  .handler(async (_, { params, ctx }) => {
    await deleteConversation(params.id, ctx.user.id);
    return { success: true };
  });

export const Route = createFileRoute("/api/chat/conversations/$id")({
  server: { handlers: { GET, PATCH, DELETE } },
});
