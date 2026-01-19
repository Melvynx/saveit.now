import { CHAT_MODEL } from "@/lib/chat/gemini-model";
import { getUserConversations } from "@/lib/database/conversations";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = userRoute.handler(async (req, { ctx }) => {
  const conversations = await getUserConversations(ctx.user.id);
  return NextResponse.json({ conversations });
});

const createSchema = z.object({
  firstMessage: z.string().min(1),
});

export const POST = userRoute
  .body(createSchema)
  .handler(async (req, { ctx, body }) => {
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

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
    });
  });
