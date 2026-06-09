# Spec 06 — AI Chat / Agents (Phase 08)

This document is the complete porting specification for the AI Chat area. An implementation
engineer should be able to port every behaviour to Convex without re-reading the originals.

---

## 1. Current files and their exact responsibilities

### Route handlers (API surface)

| File | Method | Responsibility |
|---|---|---|
| `apps/web/src/routes/api.chat.ts` | POST | Auth check, quota check-and-increment, stream `streamText` with Gemini, return `toUIMessageStreamResponse` |
| `apps/web/src/routes/api.chat.conversations.ts` | GET | List user's conversations (up to 50, ordered by `updatedAt desc`) |
| `apps/web/src/routes/api.chat.conversations.ts` | POST | Create conversation: LLM-generated title from first message, Prisma insert |
| `apps/web/src/routes/api.chat.conversations.$id.ts` | GET | Get single conversation with messages (ownership check) |
| `apps/web/src/routes/api.chat.conversations.$id.ts` | PATCH | Update title and/or messages array (ownership check) |
| `apps/web/src/routes/api.chat.conversations.$id.ts` | DELETE | Delete conversation (ownership check) |
| `apps/web/src/routes/api.chat.conversations.$id.like.ts` | POST | Increment `likes` by +1 |
| `apps/web/src/routes/api.chat.conversations.$id.dislike.ts` | POST | Decrement `likes` by -1 (passes delta -1 to same helper) |
| `apps/web/src/routes/api.chat.usage.ts` | GET | Return `{ used, limit, remaining, plan }` |

### Business logic libraries

| File | Responsibility |
|---|---|
| `apps/web/src/lib/chat/check-chat-limits.ts` | `getChatUsage`, `checkChatLimit`, `checkAndIncrementChatUsage` (atomic), `incrementChatUsage` |
| `apps/web/src/lib/chat/gemini-model.ts` | Export `CHAT_MODEL` (Gemini normal) and `getThinkingConfig` |
| `apps/web/src/lib/gemini.ts` | Model IDs, embedding dimensions, mock models for CI |
| `apps/web/src/lib/chat/tools/index.ts` | Factory: `createBookmarkTools(userId)` returning all 6 tools |
| `apps/web/src/lib/chat/tools/search-bookmarks.ts` | AI SDK `tool` — calls `searchByText`, returns bookmark list |
| `apps/web/src/lib/chat/tools/get-bookmark.ts` | AI SDK `tool` — fetches single bookmark by ID + userId |
| `apps/web/src/lib/chat/tools/show-bookmarks.ts` | AI SDK `tool` — fetches bookmarks by IDs, returns display data |
| `apps/web/src/lib/chat/tools/show-bookmark.ts` | AI SDK `tool` — fetches single bookmark for display |
| `apps/web/src/lib/chat/tools/update-tags.ts` | AI SDK `tool` — add/remove tags on multiple bookmarks |
| `apps/web/src/lib/chat/tools/download-bookmarks.ts` | AI SDK `tool` — generate CSV or JSON file content for download |
| `apps/web/src/lib/database/conversations.ts` | All Prisma CRUD for `ChatConversation` + admin helpers |
| `apps/web/src/lib/auth-limits.ts` | `AUTH_LIMITS` constants (free/pro), `getAuthLimits` helper |
| `apps/web/src/lib/search/search-by-query.ts` | Vector + tag + domain search (used by `searchBookmarks` tool) |

### Frontend

| File | Responsibility |
|---|---|
| `apps/web/src/routes/app.agents.tsx` | Route file — wraps `<AgentsPage />` in `<ClientOnly>` |
| `apps/web/src/features/app/agents/chat-page.tsx` | Full chat UI: `useChat` transport, conversation lifecycle, usage display |
| `apps/web/src/features/app/agents/components/chat-header.tsx` | Header with new/history buttons |
| `apps/web/src/features/app/agents/components/conversation-history.tsx` | Popover listing conversations, delete |
| `apps/web/src/features/app/agents/components/message-item.tsx` | Renders all message part types: text, reasoning, tool UIs |
| `apps/web/src/features/app/components/chat-bar.tsx` | Floating input bar on bookmark list → navigates to `/app/agents?q=...` |
| `apps/web/src/features/app/bookmark-card/bookmark-card-agentic-search.tsx` | Bookmark card variant that navigates to chat with query |

---

## 2. Business logic, algorithms, constants, and prompt text

### 2.1 System Prompt (verbatim — must be preserved exactly)

```
You help users find their bookmarks. Be MINIMAL, EFFICIENT, and STRICT about relevance.

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
- Example: "tweets about Claude Code prompts" -> ONLY show tweets that discuss actual prompts/instructions for Claude Code, NOT general Claude Code tips or experiences
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
- downloadBookmarks: Generate a downloadable file (CSV or JSON) from bookmark IDs. User sees a download button. Use when user asks to export/download/save bookmarks to a file.
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
</example>
```

### 2.2 Model configuration

- **Model ID for chat:** `"gemini-3.1-pro-preview"` (from `GEMINI_MODEL_IDS.normal`)
- **Provider:** `@ai-sdk/google` via `createGoogleGenerativeAI({})`
- **`stopWhen`:** `stepCountIs(20)` — maximum 20 AI SDK steps per request
- **Thinking feature:** opt-in via request body field `enableThinking: boolean` (default `false`)
  - When enabled: `providerOptions: { google: { thinkingConfig: { thinkingBudget: 8192, includeThoughts: true } } }`
  - `sendReasoning: enableThinking` passed to `toUIMessageStreamResponse`
- **Title generation model:** same `CHAT_MODEL` (`"gemini-3.1-pro-preview"`) called with `generateText`

### 2.3 Title generation prompt (verbatim)

```
Generate a short title (3-5 words max) for a chat about: "${body.firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.
```

Post-processing: `result.text.trim().replace(/^["']|["']$/g, "")` — strip leading/trailing quotes.

### 2.4 Streaming response format

`result.toUIMessageStreamResponse(...)` with:
```js
{
  originalMessages: messages,       // the incoming UIMessage[] from client
  generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
  sendReasoning: enableThinking,
}
```

Client (`useChat`) uses `DefaultChatTransport` pointing at the stream endpoint. The protocol is
**AI SDK v6 UI message stream** (not the older data stream). Both server (`ai` package) and client
(`@ai-sdk/react`) must use the same major version of the AI SDK.

### 2.5 Request body schema (incoming to stream endpoint)

```ts
{
  messages: UIMessage[],          // array of AI SDK UIMessage (role + parts)
  enableThinking: boolean,        // default false
  // NOTE: conversationId is sent by the client but NOT currently used by the stream handler
  // (the route ignores it — message persistence is done via a separate PATCH call from the client)
}
```

### 2.6 Usage limits

**Plan constants** (from `apps/web/src/lib/auth-limits.ts`):

```ts
AUTH_LIMITS = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,   // <-- chat limit
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,  // <-- chat limit
    canExport: 1,
    apiAccess: 1,
  },
}
```

Custom limits can be stored in `user.metadata.customLimits` (partial override of any limit key).
The `getAuthLimits(subscription, metadata)` function merges plan defaults with per-user overrides.

**`checkAndIncrementChatUsage` algorithm (MUST be atomic):**

```
TRANSACTION:
  1. Count chatUsage rows WHERE userId = ? AND createdAt >= start_of_current_month
  2. Fetch active subscription for userId (status IN ['active', 'trialing'])
  3. Fetch user metadata (for customLimits override)
  4. Compute effective limit via getAuthLimits(subscription, metadata)
  5. IF count >= limit → throw 429 error with message:
       "Chat limit reached. You've used ${used}/${limit} queries this month."
  6. INSERT chatUsage row (userId, createdAt = now())
```

This is currently a Prisma `$transaction`. In Convex it MUST be a single `authMutation` because
Convex mutations are serialized transactions. Never split this into a query + separate mutation.

**`getChatUsage` algorithm:**

```
1. Fetch active subscription for userId
2. Fetch user metadata
3. Compute effective limit
4. Count chatUsage rows for current month
5. Return { used, limit, remaining: max(0, limit - used), plan }
```

"Current month" boundary: `dayjs().startOf("month")` — first millisecond of the current calendar month.

### 2.7 Conversation messages storage (important architectural change)

**Current (Prisma):** `ChatConversation.messages` is a `Json` column (array of `UIMessage[]`).
The entire array is replaced on every PATCH (`updateConversationMessages`). The client POSTs the
full message array after each AI response completes.

**Target (Convex):** messages are rows in the `chatMessages` table (one row per message).
Appending uses `ctx.db.insert` into `chatMessages`; loading reads all rows
`by_conversation` index and sorts by `createdAt`. Never store messages in the conversation doc.

The `content` field in `chatMessages` is `v.any()` to hold AI SDK message parts (which vary by
message type: text, tool-call, tool-result, reasoning, etc.).

### 2.8 Conversation list ordering

`getUserConversations`: ordered by `updatedAt DESC`, limit 50. In Convex use
`.withIndex("by_user_updated", q => q.eq("userId", userId)).order("desc").take(50)`.

### 2.9 Likes/dislikes

- Like: `updateConversationLikes(id, userId, +1)` → `likes = likes + 1`
- Dislike: `updateConversationLikes(id, userId, -1)` → `likes = likes - 1`
- Both require ownership check (`userId` matches). The Prisma `updateMany({ where: { id, userId } })` provides implicit ownership. Convex must check ownership explicitly.
- `likes` can be negative (no floor).

---

## 3. Tools — exact input/output schemas

All tools receive `userId` via closure (bound at construction time). In Convex the tools must call
internal Convex functions instead of Prisma/raw SQL.

### 3.1 `searchBookmarks`

**Input schema:**
```ts
{
  query: string,
  limit?: number,        // default 6, max enforced as Math.min(limit, 20)
  types?: Array<"VIDEO"|"ARTICLE"|"PAGE"|"IMAGE"|"YOUTUBE"|"TWEET"|"PDF"|"PRODUCT">,
  tags?: string[],
  filters?: Array<"READ"|"UNREAD"|"STAR">,
}
```

**Execute:** calls `searchByText({ userId, query, matchingDistance: 0.8, types, tags, specialFilters: filters })`.

**Return shape (array of):**
```ts
{
  id, url, type, title, summary, ogImageUrl, ogDescription,
  metadata, starred: boolean, read: boolean, status,
  faviconUrl, preview, createdAt, tags: tag[]
}
```
`tags` comes from the search result's `.tags` array (with `tag.name`, `tag.type` etc.).

In Convex: replace `searchByText` with `ctx.runAction(internal.search.actions.searchByText, { userId, query, matchingDistance: 0.8, types, tags, specialFilters })`

### 3.2 `getBookmark`

**Input:** `{ id: string }`

**Execute:** `getUserBookmark(id, userId)` — Prisma `findFirst({ where: { id, userId } })`.

**Return shape:**
```ts
{ id, url, type, title, summary, ogImageUrl, metadata, starred, read, status, faviconUrl, preview, note, createdAt, updatedAt, tags }
// or: { error: "Bookmark not found" }
```

### 3.3 `showBookmarks`

**Input:** `{ bookmarkIds: string[], title?: string }`

**Execute:** `getUserBookmarksByIds(bookmarkIds, userId)` — Prisma `findMany({ where: { id: { in: bookmarkIds }, userId } })`.

**Return shape:**
```ts
{
  bookmarks: Array<{ id, url, type, title, summary, ogImageUrl, metadata, starred, read, status, faviconUrl, preview, createdAt, tags }>,
  title?: string
}
```

### 3.4 `showBookmark`

**Input:** `{ bookmarkId: string }`

**Execute:** same `getUserBookmark(bookmarkId, userId)`.

**Return shape:**
```ts
{ bookmark: { id, url, type, title, summary, ogImageUrl, metadata, starred, read, status, faviconUrl, preview, note, createdAt, tags } }
// or: { error: "Bookmark not found" }
```

### 3.5 `updateTags`

**Input:**
```ts
{
  bookmarkIds: string[],
  add?: string[],     // tag names to add
  remove?: string[],  // tag names to remove
}
```

**Validation:**
- `bookmarkIds.length === 0` → `{ error: "No bookmark IDs provided" }`
- `add.length === 0 && remove.length === 0` → `{ error: "No tags to add or remove" }`

**Execute algorithm:**
1. Fetch bookmarks where `id IN bookmarkIds AND userId = userId` (ownership check)
2. If empty → `{ error: "No bookmarks found with the provided IDs" }`
3. Dedup + trim both `add` and `remove` arrays: `Array.from(new Set(arr.filter(t => t?.trim()).map(t => t.trim())))`
4. For each bookmark:
   - For each tag in `remove`: if exists on bookmark → delete the `BookmarkTag` join row
   - For each tag in `add`: if NOT on bookmark → upsert tag (create if not exists, userId_name unique) → create `BookmarkTag` join row
5. Return:
```ts
{ success: true, bookmarksUpdated: number, tagsAdded: number, tagsRemoved: number, addedTags: string[], removedTags: string[] }
```

### 3.6 `downloadBookmarks`

**Input:**
```ts
{
  bookmarkIds: string[],
  filename?: string,   // default: "bookmarks-YYYY-MM-DD"
  format: "csv" | "json",  // default "csv"
}
```

**Validation:** `bookmarkIds.length === 0` → `{ error: "No bookmark IDs provided" }`. Empty result → `{ error: "No bookmarks found" }`.

**Execute algorithm:**
1. Fetch bookmarks by IDs + userId
2. Map to: `{ title, url, type, summary, description (ogDescription), tags (joined with ", "), starred, createdAt (ISO) }`
3. CSV: header `title,url,type,summary,description,tags,starred,createdAt` + rows (escaped with double-quote wrapping for fields containing `,`, `\n`, or `"`)
4. JSON: `JSON.stringify(mapped, null, 2)`

**Return shape:**
```ts
{
  content: string,       // file content as string
  filename: string,      // e.g. "react-tutorials.csv"
  mimeType: string,      // "text/csv" | "application/json"
  format: "csv" | "json",
  bookmarkCount: number,
}
```

The client `message-item.tsx` reads this output and renders a download button; it calls `window.URL.createObjectURL(new Blob([content], { type: mimeType }))`.

---

## 4. External API/SDK calls

### 4.1 Gemini (via `@ai-sdk/google`)

**Chat completion (streaming):**
- Provider: `createGoogleGenerativeAI({})` — reads `GOOGLE_GENERATIVE_AI_API_KEY` from environment
- Model: `google("gemini-3.1-pro-preview")`
- Call: `streamText({ model, system: SYSTEM_PROMPT, messages, tools, stopWhen: stepCountIs(20), providerOptions })`
- Response: `result.toUIMessageStreamResponse({ originalMessages, generateMessageId, sendReasoning })`

**Title generation (non-streaming):**
- Same model
- Call: `generateText({ model, prompt: titlePrompt })`
- Response: `result.text.trim().replace(/^["']|["']$/g, "")`

**Env vars:**
- `GOOGLE_GENERATIVE_AI_API_KEY` (Convex backend env, set via `npx convex env set`)

### 4.2 No other external APIs in chat

The search tools internally call `searchByText` which uses Gemini embeddings (covered in Search spec).
Tag updates and bookmark fetches use the database directly.

---

## 5. Target Convex files, function names, and signatures

### 5.1 `packages/backend/convex/chat/stream.ts` — `"use node"` HTTP action

This file contains the HTTP action mounted at `POST /chat` in `convex/http.ts`.

**Requires `"use node"` directive** (top of file) because it uses:
- `@ai-sdk/google` (Node.js-only SDK)
- `streamText` from `ai` (Node.js streaming)

**Function:** `chatStreamHandler` — `httpAction` registered in `http.ts`

**Auth pattern** (Phase 08 correction — `ctx.auth.getUserIdentity()` throws, not returns null):
```ts
let identity;
try { identity = await ctx.auth.getUserIdentity(); } catch { return new Response("Unauthorized", { status: 401 }); }
if (!identity) return new Response("Unauthorized", { status: 401 });
```

**Flow:**
1. Parse request body → validate `{ messages: UIMessage[], enableThinking?: boolean }`
2. Authenticate (above pattern)
3. Call `await ctx.runMutation(internal.chat.mutations.checkAndIncrementUsage, { userId: identity.subject })`
4. Build bookmark tools: tools call `ctx.runAction(internal.search.actions.searchByText, ...)` and `ctx.runQuery(internal.bookmarks.queries.getById, ...)` etc.
5. Call `streamText({ model: google("gemini-3.1-pro-preview"), system: SYSTEM_PROMPT, messages: convertToModelMessages(messages), tools, stopWhen: stepCountIs(20), providerOptions: getThinkingConfig(enableThinking).providerOptions })`
6. On `onFinish`: call `ctx.runMutation(internal.chat.mutations.addMessages, { conversationId, userId, messages: result.messages })`
7. Return `result.toUIMessageStreamResponse({ originalMessages: messages, generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }), sendReasoning: enableThinking })`

**Note:** The current implementation does NOT persist messages server-side — the client PATCH-es the messages array after each response. The Convex port should persist messages via `onFinish` callback, but the `conversationId` must be provided in the request body for this to work. The current client already sends `conversationId` in the request body (see `chat-page.tsx` `prepareSendMessagesRequest`) but the current server ignores it. The Convex implementation should use it.

### 5.2 `packages/backend/convex/chat/mutations.ts` — authMutation functions

All functions use `authMutation` builder (user derived server-side, never trust client-passed userId).

**`checkAndIncrementUsage`** (internal mutation — MUST be a single mutation for atomicity):
```ts
internal.chat.mutations.checkAndIncrementUsage
args: { userId: v.string() }
```
- Query `chatUsages` by index `by_user_created` where `userId = userId AND createdAt >= startOfMonth`
- Query `subscriptions` by index `by_user` for active/trialing subscription
- Get user metadata (custom limits) from betterAuth user table
- Compute effective `monthlyChatQueries` limit
- If `count >= limit` → throw `new ConvexError({ code: 429, message: "Chat limit reached..." })`
- Insert `chatUsages` row `{ userId, createdAt: Date.now() }`

**`createConversation`** (authMutation):
```ts
api.chat.mutations.createConversation
args: { firstMessage: v.string() }
returns: { id: Id<"chatConversations">, title: string }
```
- Call `generateText` (AI, via ctx.runAction internal) to generate title
- Insert into `chatConversations` `{ userId, title, likes: 0, createdAt: Date.now(), updatedAt: Date.now() }`
- Return `{ id, title }`

Note: Title generation is a non-deterministic AI call and must be in an `authAction` that then calls a mutation, not directly in a mutation. See target structure below.

**`addMessages`** (internal mutation):
```ts
internal.chat.mutations.addMessages
args: { conversationId: v.id("chatConversations"), userId: v.string(), messages: v.array(v.any()) }
```
- Verify conversation ownership: `ctx.db.get(conversationId)`, check `doc.userId === userId`
- For each message in messages array: `ctx.db.insert("chatMessages", { conversationId, userId, role, content: message, createdAt: Date.now() })`
- Patch conversation `updatedAt: Date.now()`

**`renameConversation`** (authMutation):
```ts
api.chat.mutations.renameConversation
args: { conversationId: v.id("chatConversations"), title: v.string() }
```
- Get conversation, assert `doc.userId === userId`
- `ctx.db.patch(conversationId, { title, updatedAt: Date.now() })`

**`likeConversation`** (authMutation):
```ts
api.chat.mutations.likeConversation
args: { conversationId: v.id("chatConversations") }
```
- Get conversation, assert ownership
- `ctx.db.patch(conversationId, { likes: doc.likes + 1 })`

**`dislikeConversation`** (authMutation):
```ts
api.chat.mutations.dislikeConversation
args: { conversationId: v.id("chatConversations") }
```
- Get conversation, assert ownership
- `ctx.db.patch(conversationId, { likes: doc.likes - 1 })` (can go negative)

**`deleteConversation`** (authMutation):
```ts
api.chat.mutations.deleteConversation
args: { conversationId: v.id("chatConversations") }
```
- Get conversation, assert ownership
- Delete all `chatMessages` rows `by_conversation` for this conversation
- Delete the conversation row

### 5.3 `packages/backend/convex/chat/queries.ts` — authQuery functions

**`listConversations`** (authQuery):
```ts
api.chat.queries.listConversations
args: {}
returns: Array<{ _id, title, updatedAt, createdAt }>
```
- `.withIndex("by_user_updated", q => q.eq("userId", userId)).order("desc").take(50)`
- Return list without messages (list view only shows metadata)

**`getConversation`** (authQuery):
```ts
api.chat.queries.getConversation
args: { conversationId: v.id("chatConversations") }
returns: { _id, title, likes, updatedAt, createdAt, messages: UIMessage[] } | null
```
- Get conversation, assert ownership (return null if not found or wrong user)
- Load messages: `.withIndex("by_conversation", q => q.eq("conversationId", conversationId)).order("asc").collect()`
  (safe — bounded by conversation; real upper bound is the `stopWhen: stepCountIs(20)` per request)
- Return conversation + messages array (transform `chatMessages` rows → `UIMessage[]` by reading `row.content`)

**`getChatUsage`** (authQuery):
```ts
api.chat.queries.getChatUsage
args: {}
returns: { used: number, limit: number, remaining: number, plan: string }
```
- Fetch subscription from `subscriptions` by `by_user` index
- Fetch user from betterAuth user table (for metadata / customLimits)
- Compute start of current month: `new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()`
- Count `chatUsages` rows: `.withIndex("by_user_created", q => q.eq("userId", userId).gte("createdAt", startOfMonth)).collect().length`
  (bounded monthly; safe)
- Return `{ used, limit: monthlyChatQueries, remaining: Math.max(0, limit - used), plan }`

### 5.4 `packages/backend/convex/chat/actions.ts` — authAction functions

**`createConversationWithTitle`** (authAction):
```ts
api.chat.actions.createConversationWithTitle
args: { firstMessage: v.string() }
returns: { id: string, title: string }
```
- Use `@ai-sdk/google` `generateText` to produce title (requires `"use node"`)
- Call `ctx.runMutation(internal.chat.mutations.insertConversation, { userId, title })`
- Return `{ id, title }`

This split is necessary because mutations cannot call external APIs.

---

## 6. HTTP endpoint registration (`convex/http.ts`)

```ts
http.route({
  path: "/chat",
  method: "POST",
  handler: chatStreamHandler,   // from convex/chat/stream.ts
});
```

CORS headers must be set to allow the web app origin (or `*` for dev). The web client uses
`DefaultChatTransport({ api: "${VITE_CONVEX_SITE_URL}/chat", credentials: "include" })`.

---

## 7. Validation rules, plan/limit checks, and security guards (Phase 17)

### 7.1 Authentication

- Stream endpoint: httpAction — `ctx.auth.getUserIdentity()` THROWS (not returns null) when unauthenticated. Must wrap in try/catch. Return 401 if no identity.
- Convex queries/mutations: use `authQuery`/`authMutation` builders which derive userId server-side. Never accept client-passed userId.

### 7.2 Ownership checks

All conversation operations (get, rename, delete, like, dislike, addMessages) must verify `conversation.userId === authenticated userId`. This is currently done implicitly via `updateMany({ where: { id, userId } })` in Prisma — in Convex it must be an explicit check.

Pattern:
```ts
const conversation = await ctx.db.get(args.conversationId);
if (!conversation || conversation.userId !== userId) {
  throw new ConvexError("Conversation not found");
}
```

### 7.3 Chat quota (atomic check-and-increment)

The `checkAndIncrementUsage` MUST be a single Convex mutation (serialized transaction). Never split into:
- query to read count + separate mutation to insert

This would create a TOCTOU race. The Prisma code used `$transaction` for the same reason.

### 7.4 Tool-level ownership

Each tool receives `userId` bound in closure. Tool implementations must filter queries with `userId`:
- `searchBookmarks`: passes `userId` to search function
- `getBookmark`, `showBookmark`, `showBookmarks`: pass `userId` to bookmark lookups (Prisma `findFirst({ where: { id, userId } })`)
- `updateTags`: `findMany({ where: { id: { in: bookmarkIds }, userId } })` — ensures only user's bookmarks are modified

### 7.5 Input validation

Stream endpoint validates body with zod:
```ts
z.object({
  messages: z.array(z.any()),
  enableThinking: z.boolean().optional().default(false),
})
```

Conversation create validates `firstMessage: z.string().min(1)`.
Conversation PATCH validates `{ title?: string, messages?: array }`.

---

## 8. Frontend wiring changes (Phase 16)

### 8.1 Stream transport URL

Change in `chat-page.tsx`:
```ts
// Before:
new DefaultChatTransport({ api: "/api/chat", credentials: "include" })

// After:
new DefaultChatTransport({
  api: `${import.meta.env.VITE_CONVEX_SITE_URL}/chat`,
  credentials: "include",
  // or pass Authorization header with Better Auth token
})
```

### 8.2 Conversation list and usage

Replace `upfetch("/api/chat/conversations", ...)` with `useQuery(convexQuery(api.chat.queries.listConversations, {}))`.
Replace `upfetch("/api/chat/usage", ...)` with `useQuery(convexQuery(api.chat.queries.getChatUsage, {}))`.

These become reactive (real-time updates via Convex WebSocket).

### 8.3 Mutations

Replace all `upfetch` mutations with Convex mutations:
- Create conversation: `useConvexMutation(api.chat.actions.createConversationWithTitle)`
- Rename: `useConvexMutation(api.chat.mutations.renameConversation)`
- Delete: `useConvexMutation(api.chat.mutations.deleteConversation)`
- Like/Dislike: `useConvexMutation(api.chat.mutations.likeConversation / dislikeConversation)`

### 8.4 Load conversation

Replace `upfetch(\`/api/chat/conversations/${id}\`)` with direct `useQuery` or one-shot query via `convexAction`.

### 8.5 Save messages

The current flow: client accumulates messages in `useChat` state → after `onFinish` → PATCH full messages array to server. The Convex flow: messages are persisted server-side in `onFinish` of `streamText` via `ctx.runMutation`. The client no longer needs to PATCH messages. However, the client still needs to LOAD messages when restoring a conversation — it reads from `getConversation` which returns the `chatMessages` rows.

---

## 9. Admin functions (must be ported for admin panel)

Currently in `conversations.ts`:

**`getConversationsWithLikes`:** admin-only query — returns all conversations where `likes != 0`, ordered by `likes DESC`, with user info (`id`, `email`, `name`).

**`getConversationAdmin(id)`:** admin-only — returns conversation + messages + likes + user info, no userId ownership check.

Target: `internal.chat.queries.getConversationsWithLikes` and `internal.chat.queries.getConversationAdmin` (use `requireAdmin` check). These are accessed from the admin panel (Phase 16 admin routes).

---

## 10. Edge cases, error handling, and known gotchas

### 10.1 `ctx.auth.getUserIdentity()` throws in httpActions

This is documented in the overview and Phase 08. The guard must be:
```ts
let identity;
try { identity = await ctx.auth.getUserIdentity(); } catch { return new Response("Unauthorized", { status: 401 }); }
if (!identity) return new Response("Unauthorized", { status: 401 });
```
If you omit the try/catch and the token is missing/expired, the httpAction crashes with an unhandled error.

### 10.2 Message storage migration

Current Prisma schema: `messages Json @default("[]")` on `ChatConversation`. Target Convex: `chatMessages` child table. Data migration (Phase 14) must:
1. For each existing `ChatConversation`, parse `messages` JSON array.
2. For each `UIMessage` in the array, insert a `chatMessages` row with `role`, `content` (the full message object), `conversationId`, `userId`, `createdAt` (estimate from conversation `createdAt` if per-message timestamps are unavailable).

### 10.3 AI SDK version alignment

The stream format between server (`streamText().toUIMessageStreamResponse()`) and client (`useChat` with `DefaultChatTransport`) is version-sensitive. The AI SDK v6 uses UI message stream protocol. Both `ai` (backend) and `@ai-sdk/react` (web) must be on the same major version. The current app uses `ai` (AI SDK v5-alpha / v6 — `UIMessage` type and `DefaultChatTransport` confirm v5+/v6 protocol). Verify versions in both `packages/backend/package.json` and `apps/web/package.json` before deploying.

### 10.4 Tool execution in HTTP action context

Tools currently execute as plain async functions calling Prisma. In the Convex httpAction, tools must use `ctx.runQuery` / `ctx.runMutation` / `ctx.runAction` to call Convex functions. The `userId` must be captured from the httpAction's identity and passed via closure. Since `streamText` tools receive only `input`, the userId closure approach (same as current `createBookmarkTools(userId)`) is correct.

### 10.5 conversationId flow

Currently the client sends `conversationId` in the request body but the server ignores it — message persistence is entirely client-driven (client holds state, PATCHes after each turn). In the Convex port, the server should use `conversationId` from the request body to persist messages via `onFinish`. If `conversationId` is null/undefined (new conversation), create the conversation first before streaming OR accept that the initial conversation creation is a parallel client-driven action (as it is today) and only persist messages if `conversationId` is provided.

The `chat-page.tsx` flow:
```
1. User submits message
2. sendMessage() called immediately (non-blocking)
3. If !conversationId: createConversationMutation.mutate(messageText) — parallel, non-blocking
4. Stream handler processes message (conversationId may be null initially)
5. After stream ends: client PATCHes messages to /api/chat/conversations/:id
```

For Convex, if `conversationId` is null in the stream request, the `onFinish` handler simply skips message persistence. The client's `createConversationWithTitle` action creates the conversation record and the next message turn will have a valid `conversationId`.

### 10.6 `likes` can go negative

The dislike endpoint sends `delta = -1` with no floor. A conversation with `likes = 0` that gets disliked becomes `likes = -1`. This is intentional (admin can see feedback rating). Preserve this behaviour.

### 10.7 `startOfMonth` boundary in usage counting

Both `checkAndIncrementUsage` and `getChatUsage` use `dayjs().startOf("month")` = the UTC midnight of the 1st of the current month. In Convex (no dayjs): use `new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()` for the same boundary. Note: `Date` in Convex uses the local server timezone. For consistency, use UTC: `Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)`.

### 10.8 Embedding cache for search tools

The current `searchByText` uses an in-memory/Redis `EmbeddingCache` to avoid re-embedding identical queries. In Convex the search action should implement a similar cache (Convex KV or simple in-action memoization). Without this, every tool call to `searchBookmarks` will call the Gemini Embedding API.

### 10.9 Cold start latency

The chat stream action uses `"use node"`. Node actions have a cold start penalty on first invocation. This is acceptable per Phase 08 but should be noted in the deployment notes.

### 10.10 CORS for the stream endpoint

The httpAction at `/chat` must set appropriate CORS headers since the browser will send cross-origin requests from the web app (different origin from `.convex.site`). Add:
```ts
"Access-Control-Allow-Origin": process.env.SITE_URL,
"Access-Control-Allow-Credentials": "true",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Access-Control-Allow-Headers": "Content-Type, Authorization",
```
Also add an OPTIONS preflight handler at `http.route({ path: "/chat", method: "OPTIONS", ... })`.

---

## 11. Response shapes external clients depend on (API parity)

These are the shapes the current `apps/web` frontend expects. They must be preserved or the frontend updated in tandem.

### `GET /api/chat/usage` → `getChatUsage` query
```json
{ "used": 5, "limit": 10, "remaining": 5, "plan": "free" }
```

### `GET /api/chat/conversations` → `listConversations` query
```json
{
  "conversations": [
    { "id": "...", "title": "...", "updatedAt": "ISO date", "createdAt": "ISO date" }
  ]
}
```

### `POST /api/chat/conversations` → `createConversationWithTitle` action
Request: `{ "firstMessage": "..." }`
Response: `{ "id": "...", "title": "..." }`

### `GET /api/chat/conversations/:id` → `getConversation` query
```json
{
  "conversation": {
    "id": "...", "title": "...",
    "messages": [ /* UIMessage[] */ ],
    "updatedAt": "ISO date", "createdAt": "ISO date"
  }
}
```

### `PATCH /api/chat/conversations/:id` → `renameConversation` mutation
Request: `{ "title": "..." }` or `{ "messages": [...] }` (messages updates no longer needed in Convex)
Response: `{ "success": true }`

### `DELETE /api/chat/conversations/:id` → `deleteConversation` mutation
Response: `{ "success": true }`

### `POST /api/chat/conversations/:id/like` → `likeConversation` mutation
Response: `{ "success": true }`

### `POST /api/chat/conversations/:id/dislike` → `dislikeConversation` mutation
Response: `{ "success": true }`

---

## 12. Files to create (summary)

| Target file | Type | `"use node"` |
|---|---|---|
| `packages/backend/convex/chat/stream.ts` | httpAction | Yes |
| `packages/backend/convex/chat/mutations.ts` | authMutation + internal mutations | No |
| `packages/backend/convex/chat/queries.ts` | authQuery + internal queries | No |
| `packages/backend/convex/chat/actions.ts` | authAction (title generation) | Yes |

HTTP route registration in `packages/backend/convex/http.ts` at `POST /chat` and `OPTIONS /chat`.

Files to remove after migration:
- `apps/web/src/routes/api.chat.ts`
- `apps/web/src/routes/api.chat.conversations.ts`
- `apps/web/src/routes/api.chat.conversations.$id.ts`
- `apps/web/src/routes/api.chat.conversations.$id.like.ts`
- `apps/web/src/routes/api.chat.conversations.$id.dislike.ts`
- `apps/web/src/routes/api.chat.usage.ts`
- `apps/web/src/lib/chat/` (entire directory — replaced by Convex functions)
- `apps/web/src/lib/database/conversations.ts`
