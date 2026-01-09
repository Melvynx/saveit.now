import { getRequiredUser } from "@/lib/auth-session";
import { checkAndIncrementChatUsage } from "@/lib/chat/check-chat-limits";
import { CHAT_MODEL, getThinkingConfig } from "@/lib/chat/gemini-model";
import { createBookmarkTools } from "@/lib/chat/tools";
import type { UIMessage } from "ai";
import {
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful AI assistant for SaveIt.now, a bookmark management application. You help users find, organize, and explore their saved bookmarks.

You have access to the following tools:
- searchBookmarks: Search through bookmarks using semantic search
- getBookmark: Get detailed information about a specific bookmark
- showBookmarks: Display a grid of bookmark cards to the user
- showBookmark: Display a single bookmark card with full details

When users ask about their bookmarks:
1. Use searchBookmarks to find relevant bookmarks
2. Use showBookmarks or showBookmark to display results visually
3. Provide helpful summaries and insights about the bookmarks

Be concise and helpful. When showing bookmarks, always use the show tools so users can see and interact with them.`;

const requestSchema = z.object({
  messages: z.array(z.any()),
  enableThinking: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const user = await getRequiredUser();

  const body = await req.json();
  const { messages, enableThinking } = requestSchema.parse(body);

  await checkAndIncrementChatUsage(user.id);

  const tools = createBookmarkTools(user.id);
  const thinkingConfig = getThinkingConfig(enableThinking);

  const result = streamText({
    model: CHAT_MODEL,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages as UIMessage[]),
    tools,
    stopWhen: stepCountIs(10),
    providerOptions: thinkingConfig.providerOptions,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages as UIMessage[],
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    sendReasoning: enableThinking,
  });
}
