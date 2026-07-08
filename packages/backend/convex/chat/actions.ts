"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { authAction } from "../functions";
import { withGeminiFallback } from "../lib/gemini_provider";

function cleanTitle(title: string, fallback: string) {
  const cleaned = title.trim().replace(/^["']|["']$/g, "");
  return (cleaned || fallback).slice(0, 60);
}

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
    const prompt = `Generate a short title (3-5 words max) for a chat about: "${args.firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.`;

    let title = args.firstMessage.slice(0, 40);
    try {
      const result = await withGeminiFallback((google) =>
        generateText({
          model: google("gemini-3.1-pro-preview"),
          prompt,
        }),
      );
      title = cleanTitle(result.text, title);
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

export const generateConversationTitle = internalAction({
  args: {
    conversationId: v.id("chatConversations"),
    userId: v.string(),
    firstMessage: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const fallback = args.firstMessage.replace(/\s+/g, " ").trim().slice(0, 60);
    const prompt = `Generate a short title (3-5 words max) for a chat about: "${args.firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.`;

    try {
      const result = await withGeminiFallback((google) =>
        generateText({
          model: google("gemini-3.1-pro-preview"),
          prompt,
        }),
      );
      const title = cleanTitle(result.text, fallback || "New conversation");
      await ctx.runMutation(
        internal.chat.mutations.updateGeneratedConversationTitle,
        {
          conversationId: args.conversationId,
          userId: args.userId,
          title,
        },
      );
    } catch (err) {
      console.warn("[chat.generateConversationTitle] title gen failed", err);
    }

    return null;
  },
});
