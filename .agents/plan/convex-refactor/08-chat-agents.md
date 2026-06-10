# Phase 08 — AI Chat / Agents (Convex streaming)

**Goal:** move the AI chat (currently a TanStack/Next API route using the Vercel AI SDK) into Convex:
streaming over a Convex HTTP action, with conversations + usage limits stored in Convex.

**Current logic to port:** `/api/chat` (AI SDK `useChat` transport), `/api/chat/conversations`,
`/api/chat/usage`, `apps/web/src/lib/chat/*`, `lib/database/conversations.ts`,
`apps/web/src/features/app/*chat*` and `app.agents.tsx`.

**Depends on:** Phase 02 (auth), 04 (chatConversations/chatUsages), 07 (search for RAG context).

---

## Streaming approach
**Recommended:** a raw **HTTP streaming action** in `convex/http.ts` running the Vercel AI SDK `streamText`
with Gemini and returning a streamed `Response` — simplest, and the web `useChat` already speaks this
protocol. (This is essentially porting the existing `apps/web/src/routes/api.chat.ts` handler into a Convex
httpAction.) If you later want a Convex-native component, evaluate **`@convex-dev/agent`** (with
`DeltaStreamer`) — that is the current Convex-recommended path for LLM chat, not
`@convex-dev/persistent-text-streaming`.

`convex/chat/stream.ts` (`"use node"` HTTP action, mounted in `convex/http.ts` at `/chat`):
1. Authenticate — in an httpAction, `ctx.auth.getUserIdentity()` **throws** (does NOT return `null`) when
   unauthenticated. Guard with try/catch:
   ```ts
   let identity;
   try { identity = await ctx.auth.getUserIdentity(); } catch { return new Response("Unauthorized", { status: 401 }); }
   if (!identity) return new Response("Unauthorized", { status: 401 });
   ```
2. `assertCanChat(user)` — monthly chat quota from `billing/limits.ts`; insert a `chatUsages` row.
   **SECURITY (Phase 17 B7): do the read-count → assert → insert in a SINGLE `authMutation`** (Convex
   mutations are serialized transactions) to preserve the atomic check-and-increment the current
   `checkAndIncrementChatUsage` `$transaction` provides — do not split across a query + separate mutation.
3. Build context: call `internal.search.*` to fetch the user's relevant bookmarks (RAG) for the prompt
   (port `lib/chat/*` context assembly + `createBookmarkTools` from the current `api.chat.ts`).
4. `streamText({ model: gemini("gemini-3.1-pro-preview"), messages, tools })` → return
   `result.toDataStreamResponse()` (AI SDK v6 streaming protocol the web `useChat` already speaks).
5. On finish, persist each message as a **row** via `ctx.runMutation(internal.chat.mutations.addMessages,
   { conversationId, messages })` inserting into the `chatMessages` table (NOT appending to an array —
   see Phase 04 correction).

## Conversations + usage (queries/mutations)
`convex/chat/{queries,mutations}.ts` (authQuery/authMutation) — port `conversations.ts`:
- `conversations.list` (`by_user_updated`, paginated), `conversations.get({ id })` (assert ownership;
  load its messages from `chatMessages` via `by_conversation`).
- `conversations.create`, `conversations.addMessages` (insert rows into `chatMessages`),
  `conversations.rename`, `conversations.like`, `conversations.remove` (delete the conversation AND its
  `chatMessages` rows).
- `usage.get` → returns `{ used, limit }` from `chatUsages` count (this month) vs plan limit.

## Frontend wiring
- `app.agents.tsx` / chat components keep the AI SDK `useChat`, but point its transport at the Convex
  HTTP action URL (`${VITE_CONVEX_SITE_URL}/chat`) with the auth token attached (the Better Auth client
  provides it; pass `Authorization`/cookies as the transport requires).
- Conversation list / usage badges switch to native `useQuery(api.chat.queries.*, args)`.
- Remove the old `/api/chat*` routes.

## Acceptance criteria
- Chat streams token-by-token in the UI from the Convex endpoint.
- Conversations persist + reload; usage counter increments and blocks at the plan limit.
- RAG context pulls the user's bookmarks (answers reference saved content).

## Risks
- Auth on HTTP streaming actions differs from WS queries — verify the BA token is read correctly in the
  httpAction (CORS + `Authorization` header). Test from the browser transport early.
- AI SDK streaming protocol version must match between server (`ai` in backend) and client
  (`@ai-sdk/react` in web). Keep versions aligned.
- Node action cold start on first chat; acceptable, but note it.
