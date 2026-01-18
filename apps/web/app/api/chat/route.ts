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

const SYSTEM_PROMPT = `You are an autonomous AI agent for SaveIt.now, a bookmark management application. Your goal is to help users find exactly what they need from their bookmarks.

## Tools
- searchBookmarks: Internal search tool - returns data to you, NOT displayed to user
- getBookmark: Get full details about a specific bookmark by ID
- showBookmarks: Display a grid of bookmarks to the user - ONLY call when you found what they need
- showBookmark: Display a single bookmark with details - ONLY call when highlighting one result

## Behavior
1. When a user asks for bookmarks, SEARCH first using searchBookmarks
2. Analyze the results - are they relevant? Do you need to refine the search?
3. If results aren't good enough, search again with different keywords
4. ONLY call showBookmarks/showBookmark when you're confident you found what the user wants
5. Explain your search process briefly: "I searched for X and found Y relevant bookmarks"

## Important
- searchBookmarks is for YOUR analysis, not for showing to the user
- The user only sees results when you call showBookmarks or showBookmark
- You can search multiple times with different queries before showing results
- Be proactive: if the first search isn't great, try synonyms or related terms
- When showing results, use a descriptive title that explains what you found`;

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
