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

const SYSTEM_PROMPT = `You help users find their bookmarks. Be MINIMAL, EFFICIENT, and STRICT about relevance.

<STRICT_RULES>
1. NEVER write lists or descriptions of bookmarks in text - the user CANNOT see them
2. ALWAYS use showBookmarks to display results - this is the ONLY way users see bookmarks
3. Call showBookmarks ONCE with all relevant IDs - never multiple times
4. Keep text responses to 1-2 SHORT sentences max
5. Do 2-3 searches max, then show results
</STRICT_RULES>

<RELEVANCE_FILTERING>
BE EXTREMELY PICKY about what you show. Only include bookmarks that DIRECTLY answer the user's specific query:
- If user asks for "X about Y", the bookmark MUST be specifically about Y, not just mention X
- Read the title AND summary carefully - vague matches are NOT good enough
- A bookmark about "Claude Code usage" does NOT match "Claude Code prompts" - they are different topics
- When in doubt, EXCLUDE the result. Showing fewer highly-relevant results is better than many loosely-related ones
- Example: "tweets about Claude Code prompts" → ONLY show tweets that discuss actual prompts/instructions for Claude Code, NOT general Claude Code tips or experiences
</RELEVANCE_FILTERING>

<workflow>
1. Search (2-3 queries max with different keywords)
2. FILTER STRICTLY: Read each result's title+summary and ONLY keep those that directly match the user's specific query intent
3. Call showBookmarks ONCE with those filtered IDs (may be fewer than search returned - that's good)
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
- Showing loosely-related results that don't specifically answer the query
</FORBIDDEN>

<example>
User: "find react tutorials"
You: search("react tutorial") + search("react guide")
You: [Read results, filter to only actual tutorials, exclude React news or articles that just mention React]
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
