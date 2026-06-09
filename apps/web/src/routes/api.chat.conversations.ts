import { CHAT_MODEL } from "@/lib/chat/gemini-model";
import { getUserConversations } from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@workspace/database/client";
import { generateText } from "ai";
import { z } from "zod";

const GET = userRoute.handler(async (_, { ctx }) => {
  const conversations = await getUserConversations(ctx.user.id);
  return { conversations };
});

const POST = userRoute
  .body(z.object({ firstMessage: z.string().min(1) }))
  .handler(async (_, { ctx, body }) => {
    const titlePrompt = `Generate a short title (3-5 words max) for a chat about: "${body.firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.`;

    const result = await generateText({
      model: CHAT_MODEL,
      prompt: titlePrompt,
    });

    const title = result.text.trim().replace(/^["']|["']$/g, "");

    const conversation = await prisma.chatConversation.create({
      data: {
        userId: ctx.user.id,
        title,
        messages: [],
      },
      select: { id: true, title: true },
    });

    return {
      id: conversation.id,
      title: conversation.title,
    };
  });

export const Route = createFileRoute("/api/chat/conversations")({
  server: { handlers: { GET, POST } },
});
