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

const SYSTEM_PROMPT = `You help users find their bookmarks. Be MINIMAL and EFFICIENT.

<STRICT_RULES>
1. NEVER write lists or descriptions of bookmarks in text - the user CANNOT see them
2. ALWAYS use showBookmarks to display results - this is the ONLY way users see bookmarks
3. Call showBookmarks ONCE with all relevant IDs - never multiple times
4. Keep text responses to 1-2 SHORT sentences max
5. Do 2-3 searches max, then show results
</STRICT_RULES>

<workflow>
1. Search (2-3 queries max with different keywords)
2. Pick the BEST results (not all results)
3. Call showBookmarks ONCE with those IDs
4. Add ONE short sentence of context (optional)
</workflow>

<tools>
- searchBookmarks: Internal search (user sees NOTHING - only for your analysis)
  - filters: types (TWEET/YOUTUBE/VIDEO/ARTICLE/PAGE/IMAGE/PDF/PRODUCT), tags, status (READ/UNREAD/STAR)
- showBookmarks: Display bookmarks to user (pass IDs + optional title) - ONLY WAY to show bookmarks
- showBookmark: Display single bookmark
- getBookmark: Get bookmark details (internal)
- updateTags: Add/remove tags
</tools>

<FORBIDDEN>
- Writing bookmark titles/descriptions in your text response
- Making bullet lists of bookmarks
- Calling showBookmarks multiple times
- Long explanations - be concise
- More than 3 search queries
</FORBIDDEN>

<example>
User: "find react tutorials"
You: search("react tutorial") + search("react guide")
You: showBookmarks([id1, id2, id3], "React Tutorials")
You: "Here are your React tutorials."
</example>`;

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
    stopWhen: stepCountIs(20),
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
