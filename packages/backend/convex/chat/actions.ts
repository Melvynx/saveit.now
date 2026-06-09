"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { authAction } from "../functions";

const google = createGoogleGenerativeAI({});

/**
 * Generate an LLM title for a new conversation, then insert the conversation
 * record and return its id + title.
 *
 * Title generation requires "use node" (Gemini SDK), so it must live in an
 * action. The actual DB insert is delegated to insertConversation (mutation)
 * to keep the write transactional.
 */
export const createConversationWithTitle = authAction({
  args: { firstMessage: v.string() },
  handler: async (ctx, args): Promise<{ id: string; title: string }> => {
    const userId = ctx.user.id;

    // Generate a short title using the same model as chat.
    const model = google("gemini-3.1-pro-preview");
    const prompt = `Generate a short title (3-5 words max) for a chat about: "${args.firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.`;

    let title = args.firstMessage.slice(0, 40);
    try {
      const result = await generateText({ model, prompt });
      title = result.text.trim().replace(/^["']|["']$/g, "");
      if (!title) title = args.firstMessage.slice(0, 40);
    } catch (err) {
      console.warn("[chat.createConversationWithTitle] title gen failed", err);
    }

    // Insert the conversation record (mutation for transactional safety).
    const id: Id<"chatConversations"> = await ctx.runMutation(
      internal.chat.mutations.insertConversation,
      { userId, title },
    );

    return { id: id as string, title };
  },
});
