# Spec 10 — Frontend Web Migration (Phase 16)

## Overview

The TanStack Start web app at `apps/web` uses a REST-over-HTTP data layer today: every page fetches
data via `upfetch` (a thin `up-fetch` wrapper around `fetch`) hitting TanStack Start `api.*.ts`
server-handler files that call Prisma directly. The migration is a **data-layer swap only** — no
pages are rebuilt. The job is to:

1. Replace the shared client/provider plumbing to introduce `ConvexBetterAuthProvider`.
2. Delete each `api.*.ts` Prisma handler and its corresponding `upfetch` hook, replacing them with
   `convexQuery` / `convexAction` / `useConvexMutation` calls into the Convex backend.
3. Preserve every piece of business logic (plan limits, field validation, ownership checks) — they
   now live inside Convex functions (Phases 05, 07, 08, 09, 10, 12) rather than in server handlers.

The files are listed below from most general to most specific.

---

## A. Shared Plumbing Files

### `apps/web/src/providers.tsx`

**Responsibility:** Root React provider tree. Instantiates `ConvexQueryClient` +
`QueryClient`, connects them, and wraps the app in:
`PostHogProvider > ConvexProvider > QueryClientProvider > ThemeProvider > NuqsAdapter >
TooltipProvider > Toaster > DialogManagerRenderer > UserPlanSync > ChatSnippet`

**Current plumbing (exact code):**
```ts
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "https://tough-chameleon-916.convex.cloud";
const convexQueryClient = new ConvexQueryClient(convexUrl);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);
```
Then:
```tsx
<ConvexProvider client={convexQueryClient.convexClient}>
  <QueryClientProvider client={queryClient}>
    ...
  </QueryClientProvider>
</ConvexProvider>
```

**`UserPlanSync` component** — currently polls `/api/user/limits` (upfetch) with the key
`["user", "limits", userId]`. Response schema:
```ts
z.object({
  plan: z.enum(["free", "pro"]),
  limits: z.object({
    bookmarks: z.number(),
    monthlyBookmarkRuns: z.number(),
    monthlyChatQueries: z.number(),
    canExport: z.number(),
    apiAccess: z.number(),
  }),
})
```
On success calls `useUserPlan.setState({ name: plan, limits, isLoading: false })`.
Falls back to free plan defaults when session has no userId.

**`ChatSnippet` component** — renders `<TchaoProvider websiteId="kd7ctwnpfvvrjxegjtmz7t3q018061ad" ...>`
with session user fields. No data layer change needed — stays as-is.

**Target changes:**
- Remove `ConvexProvider` import (it is superseded by `ConvexBetterAuthProvider`).
- Add `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react` wrapping the tree instead
  of `ConvexProvider`. Pass the `convexQueryClient.convexClient` to it as required by Phase 03.
- `UserPlanSync`: replace `upfetch("/api/user/limits")` with
  `useQuery(convexQuery(api.subscriptions.queries.getMine, {}))` — the Convex query returns the
  same shape `{ plan, limits }`. `QueryClient` stays; the hook must use `convexQuery` key/fn so
  results stay reactive.
- Delete `VITE_CONVEX_URL` fallback once the env var is stable in all environments.

---

### `apps/web/src/router.tsx`

**Responsibility:** Creates the TanStack router instance from the generated `routeTree.gen`.
Currently trivial — no data-layer logic.

**Target changes:** Per Phase 03 (`convexBetterAuthReactStart`), the router may need the Convex
client injected as router context so `createServerFn` and SSR loaders can use `fetchAuthQuery`.
Add `context: { convexQueryClient }` to `createRouter(...)` and pass it down.

---

### `apps/web/src/routes/__root.tsx`

**Responsibility:** Root route component. Renders `<Providers>`, `<HeadContent>`, `<Scripts>`, and
`<Outlet>`. No data fetching today.

**Target changes:** None required beyond what `providers.tsx` changes bring in. The
`ConvexBetterAuthProvider` replaces `ConvexProvider` at the `Providers` level, not here.

---

### `apps/web/src/lib/up-fetch.ts`

**Responsibility:** Singleton `upfetch` client — `up(fetch)` from the `up-fetch` npm package.
Adds schema validation (Zod), auto JSON parsing, query param serialization, and `ResponseError` /
`ValidationError` on failure. All current data hooks import from here.

**Target:** Delete this file after all hook consumers have migrated to Convex patterns.
The `up-fetch` library (and its usage pattern `upfetch("/api/...", { schema, params, body })`)
will not be used in the migrated app. Pure Convex function calls replace it.

---

### `apps/web/src/lib/safe-route.ts`

**Responsibility:** Server-side route helpers — `requireUser`, `requireAdmin`, `requireApiKey`,
`routeClient`, `userRoute`, `adminRoute`, `apiRoute`. Also `jsonError`, `getUserFromRequest`.
These are used exclusively in the `api.*.ts` handler files.

**Target:** Delete this file after all `api.*.ts` handlers are removed. The `requireUser` /
`requireAdmin` logic moves into Convex's `authQuery` / `adminQuery` builders (Phase 02).

---

### `apps/web/src/lib/auth-client.ts`

**Responsibility:** Better Auth React client — `createAuthClient` with plugins
`magicLinkClient, adminClient, emailOTPClient, apiKeyClient`. Exports `authClient`, `signIn`,
`signUp`, `useSession`.

**Admin operations used in the current UI** (via `authClient.admin.*`):
- `authClient.admin.banUser({ userId, banReason })`
- `authClient.admin.unbanUser({ userId })`
- `authClient.admin.impersonateUser({ userId })`
- `authClient.admin.setRole({ userId, role })`
- `authClient.api.listApiKeys({ headers })` (in SSR loader)

**Target:** Replace `baseURL: getServerUrl()` with `baseURL: import.meta.env.VITE_CONVEX_SITE_URL`
(Better Auth now lives on `convex.site`, not the web app origin). Add `crossDomainCookies` plugin
if web + mobile share the same backend (per Phase 02 decision). All `authClient.admin.*` calls
remain as-is since Better Auth admin plugin is wired directly to the Convex backend.

---

### `apps/web/src/lib/auth-session.ts`

**Responsibility:** SSR helpers — `getUser`, `getRequiredUser`, `getRequiredUserOrRedirect`,
`getUserLimits`, `getUserLimitsOrRedirect`. Uses `auth.api.getSession({ headers: getRequestHeaders() })`.

**Target:** Replaced by Phase 03 patterns — `fetchAuthQuery` / `getAuthUser()` helpers from
`auth-server.ts` (the TanStack Start SSR integration for `@convex-dev/better-auth`).

---

### `apps/web/src/lib/auth-limits.ts`

**Responsibility:** Plan limits constants and helpers. Defines:
```ts
AUTH_LIMITS = {
  free:  { bookmarks: 20,    monthlyBookmarkRuns: 20,   monthlyChatQueries: 10,  canExport: 0, apiAccess: 0 },
  pro:   { bookmarks: 50000, monthlyBookmarkRuns: 1500,  monthlyChatQueries: 200, canExport: 1, apiAccess: 1 },
}
```
`AUTH_LIMIT_KEYS` = `["bookmarks","monthlyBookmarkRuns","monthlyChatQueries","canExport","apiAccess"]`

`getAuthLimits(subscription?, metadata?)` merges plan limits with `metadata.customLimits`.
`parseCustomAuthLimits(metadata)` extracts `metadata.customLimits` (validates each key is
non-negative integer).

**Target:** These constants MUST be copied verbatim to `packages/backend/convex/billing/plans.ts`
(Phase 09). The web app can import them from there (`@convex/*`) or keep a local copy purely
for client-side rendering guards. Either way, keep the exact numeric values.

---

### `apps/web/src/lib/auth/user-plan.ts`

**Responsibility:** Zustand store for client-side plan/limits caching.
```ts
type UserPlan = { name: "free" | "pro"; limits: AuthLimits; isLoading: boolean }
export const useUserPlan = create<UserPlan>(() => ({ name: "free", limits: AUTH_LIMITS.free, isLoading: true }))
```
Used throughout the UI to guard premium features (export, API keys, etc.).

**Target:** Keep as-is; only the data source feeding it changes (`UserPlanSync` in providers.tsx).

---

## B. Per-Route Data-Layer Map

### Format
`Route file → current hook(s)/handler(s) → Convex target(s)`

---

### `/app` — `apps/web/src/routes/app.tsx`
Renders `<BookmarksPage>` (client-only). No loader.

**Hook:** `useBookmarks` in `features/app/use-bookmarks.ts`
- Calls `upfetch("/api/bookmarks", { params: { query, types, tags, special, limit:20, cursor, matchingDistance } })`
- Infinite query, key `["bookmarks", searchQuery, types, tags, special, matchingDistance, Boolean(query)]`
- Response: `{ bookmarks: Bookmark[], hasMore: boolean }`
- If search query is a valid URL, skips the fetch and returns `{ bookmarks: [], hasMore: false }`

**Handler:** `api.bookmarks.ts` — GET
```
GET /api/bookmarks?query=&types=&tags=&special=READ|UNREAD|STAR&limit=1-50&cursor=&matchingDistance=
→ cachedAdvancedSearch({ userId, query, tags, types, specialFilters, limit, cursor, matchingDistance })
→ Response.json({ bookmarks: [...], hasMore: boolean })
```
POST body: `{ url, transcript?, metadata? }` (or multipart with optional `image` file)

**Convex target:**
- Read: `convexAction(api.search.actions.search, { query, types, tags, specialFilters, limit, cursor, matchingDistance })` (paginated)
  — NOTE: `convexAction` from `@convex-dev/react-query` returns full TanStack Query options; do NOT nest inside `{ queryFn }`.
- Create: `useConvexMutation(api.bookmarks.mutations.create)` then `useMutation({ mutationFn: (args) => create(args) })`

**Also:** `useCreateBookmarkAction` in `features/app/use-create-bookmark.ts` calls
`upfetch("/api/bookmarks", { method: "POST", body: { url } })`. Replace with the mutation above.

**Cleanup:** Delete `api.bookmarks.ts`, `useBookmarks` hook rewrite, `useCreateBookmarkAction` rewrite.

---

### `/app/b/$bookmarkId` — `apps/web/src/routes/app.b.$bookmarkId.tsx`
Renders `<BookmarkPage bookmarkId={bookmarkId}>` (client-only). No loader.

**Hooks:**
1. `useBookmark(bookmarkId)` — `upfetch("/api/bookmarks/${bookmarkId}", { schema })` → `{ bookmark }`
2. `useBookmarkMetadata(bookmarkId)` — `upfetch("/api/bookmarks/${bookmarkId}/metadata")` → `{ title, faviconUrl }` (live fetch from URL)
3. `useBookmarkToken(bookmarkId)` — `upfetch("/api/bookmarks/${bookmarkId}/subscribe")` → `{ token }` (Inngest realtime token — DELETE)
4. `useBookmarkTags(bookmarkId)` — GET/PATCH `"/api/bookmarks/${bookmarkId}/tags"`
5. `useRefreshBookmark(bookmarkId)` — invalidates `["bookmark", bookmarkId]`

**Handlers:**
- `api.bookmarks.$bookmarkId.ts` — GET/PATCH/DELETE
  - GET: `getUserBookmark(id, userId)` → `{ bookmark }` with `tags.tag` included
  - PATCH schema: `{ starred?: boolean, read?: boolean, status?: "PENDING", note?: string | null }`
    - `read` allowed only for types ARTICLE and YOUTUBE
    - If `status === "PENDING"` → `inngest.send("bookmark/process", { bookmarkId, userId })`
    - Always calls `SearchCache.invalidateBookmarkUpdate(userId)`
  - DELETE: `deleteBookmark({ id, userId })`
- `api.bookmarks.$bookmarkId.subscribe.ts` — GET → was Inngest realtime token, DELETE this
- `api.bookmarks.$bookmarkId.tags.ts` — GET/PATCH
  - GET: returns `{ tags: [{ id, name, type }] }`
  - PATCH body: `{ tags: string[] }` — upsert/delete via tag names; normalizes to lowercase trim dedupe
- `api.bookmarks.$bookmarkId.metadata.ts` — GET: live-fetches the URL HTML and returns `{ title, faviconUrl }`
- `api.bookmarks.$bookmarkId.upload-screenshot.ts` — POST multipart `file` → uploads to S3 `users/{userId}/bookmarks/{bookmarkId}/{ts}-{name}` → updates `bookmark.preview`

**Convex targets:**
- `useBookmark` → `useQuery(convexQuery(api.bookmarks.queries.get, { id: bookmarkId }))` — reactive; no subscribe token needed
- Bookmark PATCH → `useConvexMutation(api.bookmarks.mutations.update)` (fields: `starred?, read?, status?, note?`)
  - Reprocess trigger: on `status: "PENDING"` the mutation calls `ctx.scheduler.runAfter(0, api.processing.pipeline.run, { bookmarkId })`
- Bookmark DELETE → `useConvexMutation(api.bookmarks.mutations.delete)`
- Tags GET/PATCH → `convexQuery(api.tags.queries.listForBookmark, { bookmarkId })` / `useConvexMutation(api.tags.mutations.setForBookmark)`
- Metadata (live URL fetch) → `convexAction(api.bookmarks.actions.fetchMetadata, { bookmarkId })` (public HTTP fetch inside action)
- Screenshot upload → keep as an `httpAction` or use Convex file upload flow via R2 (Phase 11)
- **Delete `useBookmarkToken` / `api.bookmarks.$bookmarkId.subscribe.ts`** — Convex reactivity replaces Inngest realtime

---

### `/app/agents` — `apps/web/src/routes/app.agents.tsx`
Renders `<AgentsPage>` (client-only).

**Current API calls:**
- `POST /api/chat` — streaming chat endpoint (Vercel AI SDK `streamText`, Gemini model)
  - Body: `{ messages: UIMessage[], enableThinking?: boolean }`
  - System prompt (MUST be preserved verbatim — see exact text in `api.chat.ts`): 521-word prompt
    about finding bookmarks, strict rules, relevance filtering, workflow, tools/forbidden list
  - Model: `CHAT_MODEL` from `@/lib/chat/gemini-model`
  - Tools: `createBookmarkTools(user.id)` — searchBookmarks, showBookmarks, showBookmark, getBookmark, updateTags, downloadBookmarks
  - Stop condition: `stepCountIs(20)`
  - Calls `checkAndIncrementChatUsage(user.id)` before streaming
  - Returns `result.toUIMessageStreamResponse({ originalMessages, generateMessageId, sendReasoning })`
- `GET /api/chat/conversations` → `{ conversations }` (list)
- `POST /api/chat/conversations` body `{ firstMessage }` → generates title via `generateText` with prompt `Generate a short title (3-5 words max)...`, creates `chatConversation` record
- `GET /api/chat/conversations/$id` → `{ conversation }`
- `PATCH /api/chat/conversations/$id` body `{ title?, messages? }` → `updateConversationTitle` / `updateConversationMessages`
- `DELETE /api/chat/conversations/$id`
- `POST /api/chat/conversations/$id/like` → `updateConversationLikes(id, userId, +1)`
- `POST /api/chat/conversations/$id/dislike` → `updateConversationLikes(id, userId, -1)`
- `GET /api/chat/usage` → `getChatUsage(userId)` response shape per `check-chat-limits.ts`

**Convex targets (Phase 08):**
- Chat stream: `POST /chat` HTTP action on `convex.site` (replaces `/api/chat`)
- `api.chat.conversations.queries.list` (query)
- `api.chat.conversations.mutations.create` (mutation — triggers title gen internally via scheduler or action)
- `api.chat.conversations.queries.get` (query)
- `api.chat.conversations.mutations.update` (mutation — title/messages)
- `api.chat.conversations.mutations.delete` (mutation)
- `api.chat.conversations.mutations.setLikes` (mutation — value +1 or -1)
- `api.chat.queries.getUsage` (query)

**Key logic to preserve:**
- Title generation prompt: `Generate a short title (3-5 words max) for a chat about: "${firstMessage}"\n\nReply with ONLY the title. No quotes, no punctuation.`
- Chat usage check must run before streaming
- `stepCountIs(20)` stop condition
- `sendReasoning: enableThinking` in response

---

### `/account` — `apps/web/src/routes/account.tsx`
SSR loader: `getAccountData` → calls `getRequiredUserOrRedirect()` → returns `{ user }`.

**Client mutations:**
- Name update: `upfetch("/api/user/profile", { method: "PATCH", body: { name } })`
- Avatar upload: `upfetch("/api/user/avatar", { method: "POST", body: FormData with "file" })`
  - Validation: max 2MB, allowed types: `image/jpeg|jpg|png|webp|gif`
  - Uploads to S3 `users/{userId}/avatar/{ts}-avatar.{ext}`
  - Updates `prisma.user.image`
- Email change: via `EmailChangeForm` using `authClient.changeEmail({ newEmail, callbackURL: "/account" })`
- Delete account: via `DeleteAccountButton` (Better Auth API)

**Handler `api.user.profile.ts` PATCH:**
```
body: { name?: string (min 1), email?: string (email) }
→ auth.api.updateUser({ headers, body: { name } })  // Better Auth
→ auth.api.changeEmail({ headers, body: { newEmail, callbackURL: "/account" } })  // Better Auth
→ { success: true }
```

**Handler `api.user.avatar.ts` POST:**
```
body: FormData "file"
→ validate size ≤ 2MB, type in [jpeg,jpg,png,webp,gif]
→ uploadFileToS3({ file, prefix: "users/{userId}/avatar", fileName: "{ts}-avatar.{ext}" })
→ prisma.user.update({ image: avatarUrl })
→ { success: true, avatarUrl }
```

**Convex targets:**
- SSR loader: replace `getRequiredUserOrRedirect()` with `fetchAuthQuery(api.auth.queries.getCurrentUser, {})`
- Name update: `authClient.updateUser({ name })` (Better Auth client method) — no custom mutation needed
- Avatar upload: `useConvexMutation(api.files.actions.uploadAvatar)` (Node action, Phase 11) — same S3 prefix pattern
- Email/delete: stay as Better Auth client methods

---

### `/account/public-link` — `apps/web/src/routes/account.public-link.tsx`
SSR loader: `getPublicLinkData` → `prisma.user.findUnique({ select: { publicLinkEnabled, publicLinkSlug } })`.

**Client:** `PublicLinkSettings` component calls `upfetch("/api/user/public-link", { method: "PATCH", body })`.

**Handler `api.user.public-link.ts` PATCH:**
```
body: { enabled: boolean, slug?: string | null }
  slug regex: /^[a-z0-9-]+$/, min 3, max 50
  if enabled && !slug → 400 "Slug is required when enabling public link"
  if enabled && slug → check slug uniqueness (prisma.user.findUnique({ where: { publicLinkSlug: slug } }))
  → prisma.user.update({ publicLinkEnabled: enabled, publicLinkSlug: enabled ? slug : null })
→ { success: true }
```

**Convex targets:**
- SSR loader: `fetchAuthQuery(api.auth.queries.getCurrentUser, {})` (returns `publicLinkEnabled`, `publicLinkSlug`)
- Mutation: `useConvexMutation(api.auth.mutations.updatePublicLink)` with same validation
  - Uniqueness check must be done in the mutation using `withIndex("by_publicLinkSlug")`

---

### `/account/keys` — `apps/web/src/routes/account.keys.tsx`
SSR loader: checks `plan.limits.apiAccess` — if 0, skips API key listing.
If `apiAccess !== 0`: calls `auth.api.listApiKeys({ headers })`.

**Components:** `ApiKeyList`, `CreateApiKeyForm` — use Better Auth `apiKey` client plugin directly:
- Create: `authClient.apiKey.create({ name, ... })`
- Revoke: `authClient.apiKey.revoke({ keyId })`
- Update name: `upfetch("/api/account/keys/$keyId", { method: "PATCH", body: { name } })`

**Handler `api.account.keys.$keyId.ts` PATCH:**
```
body: { name: string trim min 1 max 255 }
→ prisma.apikey.updateMany({ where: { id: keyId, userId }, data: { name, updatedAt: now } })
→ { success: true } or 404
```

**Convex targets:**
- SSR loader: `fetchAuthQuery(api.subscriptions.queries.getMine, {})` for plan check
- List/create/revoke: Better Auth `apiKey` client plugin calls (point at `VITE_CONVEX_SITE_URL`)
- Update name: `useConvexMutation(api.apiKeys.mutations.updateName)` or keep as Better Auth extension

---

### `/billing` — `apps/web/src/routes/billing.tsx`
SSR loader: creates Stripe billing portal session → redirects.
```
prisma.user.findUnique({ select: { stripeCustomerId } })
stripeClient.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: "${serverUrl}/app" })
→ redirect(portalUrl) or show error card
```

**Convex target:** Replace SSR loader with call to `api.stripe.actions.createBillingPortal`
(Phase 09 action). Response: `{ url: string }`. Loader does `throw redirect({ href: url })`.

---

### `/upgrade` — `apps/web/src/routes/upgrade.tsx`
**Render:** `<UpgradePage>` via `features/upgrade/upgrade-page.tsx` (no loader).

**Hooks in `upgrade-page.tsx`:** `upfetch("/api/upgrade", { method: "POST", body: { plan, annual, successUrl, cancelUrl } })` → `{ url: string }` (Stripe checkout URL).

**Handler `api.upgrade.ts` POST:**
```
body: { plan: string, annual: boolean, successUrl: string, cancelUrl: string }
→ createUpgradeCheckoutSession({ userId, plan, annual, successUrl, cancelUrl })
```
`createUpgradeCheckoutSession` (in `features/upgrade/upgrade-api.ts`) calls `stripeClient.checkout.sessions.create(...)`.

**Convex target:** `useConvexMutation(api.stripe.actions.createCheckout)` with same body shape. Returns `{ url }`.

---

### `/upgrade/new-pricing` — `apps/web/src/routes/upgrade.new-pricing.tsx`
Renders `<PricingSection>` — pricing UI calling the same upgrade mutation above. No separate handler.

---

### `/upgrade/success` — `apps/web/src/routes/upgrade.success.tsx`
Static success page + `<ConfettiBurst>`. No data fetching.

---

### `/exports` — `apps/web/src/routes/exports.tsx`
SSR loader: `getUserLimitsOrRedirect()` — if `limits.canExport === 0`, shows upgrade prompt.

**`ExportForm` component:** `upfetch("/api/exports", { method: "POST" })` → `{ csvContent: string, totalBookmarks: number }`.

**Handler `api.exports.ts` POST:**
```
→ check limits (getAuthLimits + getUserMetadata): limits.canExport === 0 → 400 "max exports reached"
→ prisma.bookmark.findMany({ where: { userId }, select: { title, ogDescription, summary, type, url }, orderBy: { createdAt: "desc" } })
→ generate CSV: header "title,description,summary,type,url\n" + rows
→ escapeCsvField(field): if field contains comma/newline/quote → wrap in double quotes, escape internal quotes
→ { csvContent, totalBookmarks }
```

**Convex targets:**
- SSR loader: `fetchAuthQuery(api.subscriptions.queries.getMine, {})`
- Export action: `useConvexMutation(api.bookmarks.actions.export)` — returns CSV content
  - Must check `canExport` limit gate inside the action
  - CSV format must match exactly (same columns, same escapeCsvField logic)

---

### `/imports` — `apps/web/src/routes/imports.tsx`
No loader. `<ImportForm>` handles everything client-side.

**Handler `api.imports.ts` POST:**
```
body: { text: string }
→ URL_REGEX.exec(text) → uniqueUrls array
→ check limits: count current bookmarks, compute availableSlots = limits.bookmarks - current
  if availableSlots <= 0 → 400 "reached bookmark limit"
→ urlsToProcess = uniqueUrls.slice(0, availableSlots)
→ for each url: createBookmark({ url, userId }) — stops early if "maximum number of bookmarks" error
→ { totalUrls, processedUrls, skippedUrls, createdBookmarks, failedBookmarks,
    availableSlots, results: [{ url, success, error?, bookmark? }],
    hasMoreUrls, limitReached }
```
`URL_REGEX` is from `features/imports/url-regex.ts` — must be preserved.

**Convex targets:**
- `useConvexMutation(api.bookmarks.mutations.bulkImport)` — action that accepts `{ text: string }`, extracts URLs, checks limits, calls create for each
- Must return same response shape (clients display per-URL results)
- Batch with `ctx.scheduler` if > 20 URLs to avoid mutation time limits

---

### `/tags` — `apps/web/src/routes/tags.tsx`
No loader. `<TagsPageClient>` renders all tag management UI.

**Hooks:**
- `useTags(query)` — `GET /api/tags?q=&limit=` → `{ tags, nextCursor, hasNextPage }`
- `useInfiniteTags(query)` — infinite pagination version of above
- Tag refactor: `useTagRefactor` in `features/tags/hooks/use-tag-refactor.ts`

**Handlers:**
- `api.tags.ts` GET: `prisma.tag.findMany({ where: { userId, name: contains query }, orderBy: { id: "asc" }, take: limit+1 })` cursor-paginated
- `api.tags.ts` POST: `prisma.tag.create({ name, userId, type: "USER" })` → `{ success, tag }`
- `api.tags.bulk-delete.ts` POST: `{ tagIds: string[] }` — validates ownership, deletes `bookmarkTag` records then tags, returns `{ deletedTags, totalBookmarksAffected }`
- `api.tags.cleanup.ts` POST: AI cleanup suggestions via `generateTagCleanupSuggestions(tagNames)` (Gemini). Returns `{ suggestions, totalTags }`. Suggestion shape: `{ bestTag, bestTagExists, bestTagId, bestTagBookmarkCount, refactorTags: [{ id, name, bookmarkCount }], totalBookmarks }`
- `api.tags.management.ts` GET: same as tags GET but includes `_count.bookmarks`, ordered by `bookmarks._count desc`, limit 20
- `api.tags.refactor.ts` POST: `{ refactors: [{ bestTag, refactorTagIds, createBestTag }] }` — bulk tag merge
  - For each operation: validates ownership, optionally creates bestTag, moves all bookmarkTag relations to bestTag, deletes old tags
  - Returns `{ success, results, summary: { operationsApplied, totalBookmarksAffected, totalTagsRemoved } }`

**Convex targets:**
- `convexQuery(api.tags.queries.list, { q?, cursor?, limit? })` (paginated)
- `useConvexMutation(api.tags.mutations.create)`
- `useConvexMutation(api.tags.mutations.bulkDelete)`
- `convexAction(api.tags.actions.cleanup)` — calls Gemini for suggestions (node action)
- `convexQuery(api.tags.queries.listWithBookmarkCounts, { q?, cursor? })`
- `useConvexMutation(api.tags.mutations.refactor)` (bulk tag merge, internal-called in sequence)

---

### `/admin` — `apps/web/src/routes/admin.tsx`
SSR loader: `getAdminOverview()` (Prisma aggregate queries) — returns:
```ts
{
  totalUsers, activeUsers, premiumUsers, regularUsers,
  totalBookmarks, totalClicks, adminUsers, bannedUsers, marketingEligibleUsers
}
```
Auth check: `user.role !== "admin"` → returns `{ access: "forbidden" }`.

**Convex target:**
- Loader: `fetchAuthQuery(api.admin.queries.getOverview, {})` using `adminQuery` builder (only works if `user.role === "admin"`)
- `adminQuery` enforces admin-only access server-side — no client-side role check needed

---

### `/admin/users` — `apps/web/src/routes/admin.users.tsx`
SSR loader: `getUsersWithStats({ page, pageSize:10, search, sortBy, order, filter, status, role })`.
URL search params: `page, search, sortBy, order, filter, status, role`.

Response shape: `{ users: UserWithStats[], total, totalPages }`.
`UserWithStats` includes: `id, name, email, role, banned, banReason, emailVerified, createdAt, metadata, publicLinkEnabled, subscriptions: [{ status, plan }], _count: { bookmarks, bookmarkOpens }`.

**Client mutations in `UserRow`** (features/admin/user-row.tsx):
- `authClient.admin.banUser({ userId, banReason })` — Better Auth admin
- `authClient.admin.unbanUser({ userId })`
- `authClient.admin.impersonateUser({ userId })`
- `authClient.admin.setRole({ userId, role: "admin"|"user" })`

**Convex target:**
- Loader: `fetchAuthQuery(api.admin.queries.listUsers, { page, search, sortBy, order, filter, status, role })`
- Admin mutations stay as `authClient.admin.*` — they call Better Auth directly on `VITE_CONVEX_SITE_URL`

---

### `/admin/users/$userId` — `apps/web/src/routes/admin.users.$userId.tsx`
SSR loader:
```
prisma.bookmark.count({ where: { userId } })
prisma.bookmarkOpen.count({ where: { userId } })
prisma.user.findUnique({ where: { id: userId } })
prisma.subscription.findFirst({ where: { referenceId: userId, status: in [active, trialing] } })
→ getAuthLimits(subscription), parseCustomAuthLimits(userData.metadata), getAuthLimits(subscription, userData.metadata)
```
Returns `{ bookmarks, clickCount, userData, baseLimits, customLimits, effectiveLimits }`.

**`CustomLimitsForm` component** (features/admin/custom-limits-form.tsx):
- Posts to `upfetch("/api/admin/users/${userId}/custom-limits", { method: "POST", body })`.
- Limit fields: `bookmarks, monthlyBookmarkRuns, monthlyChatQueries, canExport, apiAccess` — each nullable int ≥ 0.

**Handler `api.admin.users.$userId.custom-limits.ts` POST:**
```
body: { bookmarks?, monthlyBookmarkRuns?, monthlyChatQueries?, canExport?, apiAccess? } (all optional nullable int ≥ 0)
→ validate target user exists
→ build customLimits object (only include numeric values)
→ getUserMetadata(userId) → merge { ...metadata, customLimits }
→ prisma.user.update({ metadata: nextMetadata })
→ { customLimits }
```

**Convex targets:**
- Loader: `fetchAuthQuery(api.admin.queries.getUserDetail, { userId })`
- Custom limits mutation: `useConvexMutation(api.admin.mutations.setCustomLimits)` — updates `user.metadata.customLimits` in Convex betterAuth user table

---

### `/admin/conversations` — `apps/web/src/routes/admin.conversations.tsx`
SSR loader: `getConversationsWithLikes()` — lists conversations that have any like/dislike, includes `user.name`, `user.email`, `likes`, `updatedAt`.

**Convex target:** `fetchAuthQuery(api.admin.queries.listConversationsWithFeedback, {})`

---

### `/admin/conversations/$id` — `apps/web/src/routes/admin.conversations.$id.tsx`
SSR loader: `getConversationAdmin(id)` — returns conversation with messages, user, likes.
Messages structure: `{ id, role, parts: [{ type, text }] }`.

**Convex target:** `fetchAuthQuery(api.admin.queries.getConversation, { id })`

---

### `/admin/send-email` — `apps/web/src/routes/admin.send-email.tsx`
SSR loader: `getMarketingEligibleUsersCount()` — count of users with `unsubscribed !== true`.

**`EmailComposer` component** (features/admin/email-composer.tsx):
- Posts `upfetch("/api/admin/send-email", { method: "POST", body: { subject, preview, markdown } })` → `{ success: boolean }`.

**Handler `api.admin.send-email.ts` POST:**
```
body: { subject (min 1), preview (min 1), markdown (min 1) }
→ inngest.send("marketing/batch-email", { data: { subject.trim(), subheadline: preview.trim(), markdown: markdown.trim() } })
→ { success: true }
```

**Convex target:**
- Loader: `fetchAuthQuery(api.admin.queries.getMarketingStats, {})`
- Send email: `useConvexMutation(api.admin.mutations.sendMarketingEmail)` — schedules the batch email job via `ctx.scheduler.runAfter(0, api.marketing.actions.sendBatch, { subject, subheadline, markdown })`

---

### `/p/$bookmarkId` — `apps/web/src/routes/p.$bookmarkId.tsx`
SSR loader (public, no auth required):
```
getPublicBookmark(bookmarkId) — probably where(status: "READY" or no restriction on public)
getUser() — optional
relatedBookmarks query:
  prisma.bookmark.findMany({
    where: { id: { not: bookmarkId }, status: "READY", title: { not: null },
             tags: { some: { tagId: { in: tagIds } } } },
    select: { id, title, url, ogImageUrl, faviconUrl, summary, ogDescription, type, tags: { select: { tag: { select: { name } } }, take: 3 } },
    take: 6, orderBy: { createdAt: "desc" }
  })
JSON-LD schema.org structured data generated server-side.
```

**Convex target:**
- `fetchQuery(api.bookmarks.queries.getPublic, { id: bookmarkId })` (no auth)
- `fetchQuery(api.bookmarks.queries.getRelated, { id: bookmarkId, tagIds })` — public query, `take: 6`
- JSON-LD stays computed client-side or in SSR loader using the returned data

---

### `/p/$bookmarkId/read` — `apps/web/src/routes/p.$bookmarkId.read.tsx`
SSR loader: `getPublicBookmark(bookmarkId)` + `getUser()`. Reads `getMarkdownContent(bookmark.metadata)`.

**Convex target:** Same public query as above; `getMarkdownContent` is a pure utility — stays in the web app.

---

### `/u/$slug` — `apps/web/src/routes/u.$slug.tsx`
SSR loader:
```
prisma.user.findUnique({ where: { publicLinkSlug: slug, publicLinkEnabled: true }, select: { id, name } })
```
Then `<PublicBookmarksPage slug={slug}>` (fetches bookmarks for the public profile).

**Convex target:**
- `fetchQuery(api.auth.queries.getUserByPublicSlug, { slug })` — public query
- `PublicBookmarksPage` component: `useQuery(convexQuery(api.bookmarks.queries.listPublic, { slug }))` or similar

---

### `/unsubscribe/$userId` — `apps/web/src/routes/unsubscribe.$userId.tsx`
SSR loader: `prisma.user.findUnique({ where: { id: userId }, select: { id, email, unsubscribed } })`.

**`UnsubscribeForm`** calls `POST /api/unsubscribe/$userId`:
```
→ prisma.user.findUnique({ select: { id, email, unsubscribed } })
→ if unsubscribed: { success: true, message: "already unsubscribed" }
→ else: prisma.user.update({ unsubscribed: true })
→ { success: true, message: "Successfully unsubscribed" }
```

**Convex target:**
- SSR loader: `fetchQuery(api.email.queries.getUnsubscribeStatus, { userId })` (public)
- Action: `useConvexMutation(api.email.mutations.unsubscribe)` (no auth needed — just userId)

---

### `/changelog` + `/changelog/versions` — `apps/web/src/routes/changelog.tsx`
Fully static — reads from `lib/changelog/changelog-data.ts` local file. No DB calls.

**Changelog dismiss APIs** (used by a notification/banner component elsewhere):
- `POST /api/changelog/dismiss` body `{ version }` → `markChangelogAsDismissed(userId, version)` via Redis
- `POST /api/changelog/check-dismissed` body `{ version }` → `{ isDismissed }` via Redis

**Convex target:** Replace Redis read-state with a small Convex mutation/query on a `changelogDismissals` table, or simply drop dismiss functionality (lowest priority). Key: `(userId, version)`.

---

### `/verify` — `apps/web/src/routes/verify.tsx`
Static card — no data fetching. Just shows "I just sent you an email, click on the link".

---

### `/tools/*` — `apps/web/src/routes/tools.*.tsx`

All tools pages are static content pages with a client-side tool component that calls the matching
`api.tools.*` endpoint. These endpoints are **public** (no auth required) and use PostHog for
analytics (`captureToolUsage(request, toolName)`).

#### `tools/extract-content` — `api.tools.extract-content.ts` POST
```
body: { url: string }
→ fetchHtml(url)
→ cheerio parse, extract article/main/body HTML
→ TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" })
→ markdown, plainText, wordCount, readingTime = ceil(wordCount/225), paragraphCount
→ title from og:title / twitter:title / h1 / title tag / hostname
→ faviconUrl from link[rel='icon'][sizes='32x32'] / shortcut icon / icon / apple-touch-icon
   fallback: `${origin}/favicon.ico`
→ ExtractContentResponse { url, content: { title, plainText, markdown, statistics }, metadata: { ... } }
```

#### `tools/extract-metadata` — `api.tools.extract-metadata.ts` POST
Full OG/Twitter/technical/pageAnalysis extraction with cheerio. 100+ fields.

#### `tools/extract-favicons` — `api.tools.extract-favicons.ts` POST
```
body: { url: string }
→ fetchHtml, parse link[rel*='icon'], validate each via HEAD request
→ standard favicon paths list (9 standard paths)
→ returns { url, favicons: FaviconInfo[], metadata: { totalFavicons, validFavicons, standardFavicon, appleTouchIcon, ... } }
TOOL_USER_AGENT constant (must be preserved).
```

#### `tools/og-images` — `api.tools.og-images.ts` POST
Extracts og:image / twitter:image, page title, description.

#### `tools/youtube-metadata` — `api.tools.youtube-metadata.ts` POST
```
body: { url: string }
→ extractVideoId(url) using YOUTUBE_URL_PATTERNS (2 regex patterns)
→ fetch https://www.youtube.com/watch?v=${videoId} with specific headers
→ parse og:title, og:description, JSON-LD VideoObject
→ parseISO8601Duration(duration): converts PT1H30M15S → "1h 30m 15s"
→ generateThumbnails(videoId): 5 quality tiers (default/mqdefault/hqdefault/sddefault/maxresdefault)
→ returns { success, data: { videoId, title, description, channelTitle, channelId, publishedAt, duration, viewCount, thumbnails, url } }
```

**Convex targets for all tools:** `convexAction(api.tools.actions.extractContent/extractMetadata/extractFavicons/ogImages/youtubeMetadata, { url })` (node actions, public — no auth check). Must replicate `captureToolUsage` (PostHog server-side) inside the action. Rate limiting should be added (Phase 17).

---

### Other handlers that need handling:

#### `api.b.ts` GET `?url=` (quick-save redirect)
`createBookmark({ url, userId })` → `Response.redirect("/app")`.
**Convex:** Replace with a thin HTML redirect page or keep as an HTTP action `GET /b?url=` in `convex/http.ts`.

#### `api.bookmarks.info.ts` GET
Returns `{ bookmarksCount: number }`.
**Convex:** `convexQuery(api.bookmarks.queries.getCount, {})`

#### `api.mobile.checkout.ts` POST
Same as upgrade but without `plan` param — uses `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_YEARLY_PRICE_ID` directly.
Used by mobile app. **Convex:** Keep as HTTP action in `convex/http.ts` (`POST /api/mobile/checkout`) — or route via Phase 12 public API.

#### `api.og.bookmark.$bookmarkId.ts` GET
Generates SVG OG image on-the-fly from bookmark data. No auth.
**Convex:** HTTP action `GET /og/bookmark/:id` in `convex/http.ts` — reads from Convex DB, generates same SVG (copy exact SVG template).

#### `api.bug-report.ts` POST
```
body: { description (min 10), deviceInfo?, appVersion? }
→ sendEmail({ to: "help@saveit.now", subject: `Bug Report from ${user.email}`, html: emailContent, replyTo: user.email })
```
**Convex:** `useConvexMutation(api.email.actions.sendBugReport)` or keep as HTTP action.

#### `api.webhooks.stripe.ts` POST
Full Stripe webhook handler — verifies signature with `STRIPE_WEBHOOK_SECRET`.
Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
On `customer.subscription.updated` → if upgrade from free, retry failed ERROR bookmarks (those with `metadata.error contains "Limit exceeded"`).
**Convex:** Moves entirely to `convex/http.ts` `POST /stripe/webhook`. Logic identical; use `ctx.runMutation` (internal). See Phase 09.

#### `api.auth.$.ts` GET/POST/OPTIONS
Better Auth catch-all handler. **Convex:** Remove — auth now lives at `VITE_CONVEX_SITE_URL/api/auth/*` served by `authComponent.registerRoutes(http)` in `convex/http.ts`.

#### `api.inngest.ts`
Inngest serve endpoint. **Delete** after Inngest is retired (Phase 06).

#### `api.health.ts`, `api.start.ts`, `api.fake-worker.*.ts`
Keep or delete as appropriate — not data-layer.

---

## C. Provider / Router Plumbing Summary (what must change)

| Layer | Today | After migration |
|---|---|---|
| Convex client instantiation | `new ConvexQueryClient(VITE_CONVEX_URL)` in `providers.tsx` | Same, but `VITE_CONVEX_URL` = `.convex.cloud` WebSocket URL |
| Auth provider | `<ConvexProvider client={convexQueryClient.convexClient}>` | `<ConvexBetterAuthProvider client={convexQueryClient.convexClient}>` |
| Auth base URL | `getServerUrl()` (web app origin) | `VITE_CONVEX_SITE_URL` (`.convex.site` HTTP URL) |
| SSR auth fetch | `auth.api.getSession({ headers: getRequestHeaders() })` | `fetchAuthQuery(api.auth.queries.getSession, {})` from auth-server.ts |
| Router context | None | `{ convexQueryClient }` passed as router context for SSR |
| Plan data | `upfetch("/api/user/limits")` polled in `UserPlanSync` | `convexQuery(api.subscriptions.queries.getMine, {})` reactive |

---

## D. Convex Function Signatures Required

Below is a condensed list of Convex functions that Phase 16 expects to exist (from Phases 05/07/08/09):

```ts
// Bookmarks
api.bookmarks.queries.list       // authQuery — paginated
api.bookmarks.queries.get        // authQuery — single bookmark
api.bookmarks.queries.getCount   // authQuery — { count }
api.bookmarks.queries.getPublic  // query (no auth) — single public bookmark
api.bookmarks.queries.listPublic // query (no auth) — by publicLinkSlug
api.bookmarks.queries.getRelated // query (no auth) — by tagIds, take 6
api.bookmarks.mutations.create   // authMutation
api.bookmarks.mutations.update   // authMutation — { id, starred?, read?, status?, note? }
api.bookmarks.mutations.delete   // authMutation
api.bookmarks.mutations.bulkImport // authAction — { text: string }
api.bookmarks.actions.export     // authAction — returns CSV string
api.bookmarks.actions.fetchMetadata // authAction — live URL fetch { title, faviconUrl }

// Search
api.search.actions.search        // authAction — { query, types, tags, specialFilters, limit, cursor, matchingDistance }

// Tags
api.tags.queries.list             // authQuery — paginated
api.tags.queries.listForBookmark  // authQuery
api.tags.queries.listWithBookmarkCounts // authQuery — paginated, sorted by count desc
api.tags.mutations.create         // authMutation
api.tags.mutations.bulkDelete     // authMutation
api.tags.mutations.setForBookmark // authMutation
api.tags.mutations.refactor       // authMutation
api.tags.actions.cleanup          // authAction (node) — Gemini call

// Chat
api.chat.conversations.queries.list // authQuery
api.chat.conversations.queries.get  // authQuery
api.chat.conversations.mutations.create  // authMutation
api.chat.conversations.mutations.update  // authMutation
api.chat.conversations.mutations.delete  // authMutation
api.chat.conversations.mutations.setLikes // authMutation — { id, delta: 1 | -1 }
api.chat.queries.getUsage         // authQuery

// Subscriptions / Billing
api.subscriptions.queries.getMine // authQuery — { plan, limits, customLimits, subscription }
api.stripe.actions.createCheckout // authAction
api.stripe.actions.createBillingPortal // authAction

// Auth (custom user fields)
api.auth.queries.getCurrentUser   // authQuery
api.auth.queries.getSession       // authQuery
api.auth.queries.getUserByPublicSlug // public query
api.auth.mutations.updatePublicLink  // authMutation — { enabled, slug? }

// Files
api.files.actions.uploadAvatar    // authAction (node) — FormData → R2 URL

// Admin
api.admin.queries.getOverview     // adminQuery
api.admin.queries.listUsers       // adminQuery — paginated + filters
api.admin.queries.getUserDetail   // adminQuery
api.admin.queries.listConversationsWithFeedback // adminQuery
api.admin.queries.getConversation // adminQuery
api.admin.queries.getMarketingStats // adminQuery
api.admin.mutations.setCustomLimits // adminMutation — { userId, limits }
api.admin.mutations.sendMarketingEmail // adminMutation → schedules batch

// Email / Marketing
api.email.queries.getUnsubscribeStatus // public query — { id, email, unsubscribed }
api.email.mutations.unsubscribe    // public mutation (no auth)
api.email.actions.sendBugReport    // authAction

// Tools (all public, node actions)
api.tools.actions.extractContent
api.tools.actions.extractMetadata
api.tools.actions.extractFavicons
api.tools.actions.ogImages
api.tools.actions.youtubeMetadata

// API Keys
api.apiKeys.mutations.updateName  // authMutation

// Changelog
api.changelog.queries.isDismissed  // authQuery
api.changelog.mutations.dismiss    // authMutation
```

---

## E. Correct Convex Client Call Patterns (from Phase 16 spec)

```ts
// Reactive read (replaces upfetch GET + useQuery)
const { data } = useQuery(convexQuery(api.bookmarks.queries.list, args));

// Action via TanStack Query (convexAction returns full options — do NOT nest in { queryFn })
const { data } = useQuery(convexAction(api.search.actions.search, { query }));

// Mutation — useConvexMutation is a hook; call at top level
const create = useConvexMutation(api.bookmarks.mutations.create);
const { mutate } = useMutation({ mutationFn: (a) => create(a) });
// Or call create(a) directly from an event handler

// Infinite pagination with Convex (for useBookmarks)
useInfiniteQuery({
  queryKey: convexQuery(api.search.actions.search, baseArgs).queryKey,
  queryFn: convexQuery(api.search.actions.search, { ...baseArgs, cursor: pageParam }).queryFn,
  getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  initialPageParam: undefined,
});
```

---

## F. Security Guards / Ownership Checks (Phase 17 note)

All of the following checks are enforced today in the REST handlers and MUST be preserved in Convex:

1. **`requireUser` / auth check** — every authenticated route. Convex: `authQuery/authMutation` builders.
2. **`requireAdmin`** — admin routes check `user.role === "admin"`. Convex: `adminQuery/adminMutation`.
3. **Bookmark ownership** — `WHERE id = ? AND userId = ?` on every bookmark read/patch/delete.
4. **Bookmark type guard for `read` field** — only ARTICLE and YOUTUBE types may set `read`.
5. **Tag ownership** — all tag mutations validate `userId` matches; bulk-delete verifies all IDs belong to user.
6. **Custom limits validation** — each key must be a non-negative integer; null removes the override.
7. **Slug uniqueness** — public link slug must be unique across users.
8. **Export gate** — `limits.canExport === 0` → block.
9. **API key access gate** — `limits.apiAccess === 0` → skip listing.
10. **Import slot enforcement** — cannot import beyond `limits.bookmarks - currentCount`.
11. **Stripe webhook signature** — `constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` — 400 on fail.
12. **Avatar file validation** — max 2MB, allowed types: jpeg/jpg/png/webp/gif.
13. **Screenshot upload validation** — same as avatar validation.

---

## G. Key Constants and Magic Numbers to Preserve

| Constant | Value | Location |
|---|---|---|
| Free plan bookmarks | 20 | `auth-limits.ts` → `billing/plans.ts` |
| Free plan monthlyBookmarkRuns | 20 | same |
| Free plan monthlyChatQueries | 10 | same |
| Free plan canExport | 0 | same |
| Free plan apiAccess | 0 | same |
| Pro plan bookmarks | 50000 | same |
| Pro plan monthlyBookmarkRuns | 1500 | same |
| Pro plan monthlyChatQueries | 200 | same |
| Bookmark list limit min | 1 | `api.bookmarks.ts` |
| Bookmark list limit max | 50 | `api.bookmarks.ts` |
| Default limit | 20 | `api.bookmarks.ts` |
| Reading time words/min | 225 | `api.tools.extract-content.ts` `calculateReadingTime` |
| Avatar max file size | 2 * 1024 * 1024 (2MB) | `api.user.avatar.ts` |
| Avatar S3 prefix | `users/{userId}/avatar` | same |
| Bookmark screenshot prefix | `users/{userId}/bookmarks/{bookmarkId}` | `api.bookmarks.$bookmarkId.upload-screenshot.ts` |
| Chat stop condition | `stepCountIs(20)` | `api.chat.ts` |
| Chat model | from `CHAT_MODEL` (Gemini) | `lib/chat/gemini-model.ts` |
| Public link slug regex | `/^[a-z0-9-]+$/` min 3 max 50 | `api.user.public-link.ts` |
| API key name max | 255 chars | `api.account.keys.$keyId.ts` |
| Tags management default limit | 20 | `api.tags.management.ts` |
| Tags list default limit | 10 | `api.tags.ts` |
| Better Auth cookie prefix | `save-it` | global convention |
| `VITE_CONVEX_URL` | `.convex.cloud` WebSocket | providers.tsx |
| `VITE_CONVEX_SITE_URL` | `.convex.site` HTTP | auth-client.ts |

---

## H. Verbatim Chat System Prompt (MUST be preserved exactly)

From `api.chat.ts`:

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

---

## I. Conversation title generation prompt (MUST be preserved)

From `api.chat.conversations.ts`:
```
Generate a short title (3-5 words max) for a chat about: "${firstMessage}"

Reply with ONLY the title. No quotes, no punctuation.
```
Then: `title = result.text.trim().replace(/^["']|["']$/g, "")`.

---

## J. OG Image SVG Template (MUST be preserved)

From `api.og.bookmark.$bookmarkId.ts` — generates SVG at 1200x630:
- Background: `#0a0a0a`
- "SaveIt.now" brand text: `#a78bfa`, font-size 28, y=88
- Type badge: `#1f2937` rect at x=980, text `#d1d5db` font-size 16
- Title: `#f9fafb`, font-size 52, y=195, truncated to 70 chars
- Description: `#9ca3af`, font-size 24, y=275, truncated to 150 chars
- Tags: up to 4 tags as rounded pills, `#1f2937` fill, text `#d1d5db`, font-size 16, at y=530, spaced 150px apart
- Domain: `#6b7280`, font-size 18, at x=1140, y=554, text-anchor=end

---

## K. Deletion List (to remove after each feature migrates)

Files to delete:
- `apps/web/src/lib/up-fetch.ts`
- `apps/web/src/lib/safe-route.ts`
- `apps/web/src/lib/auth-session.ts`
- `apps/web/src/lib/auth.ts` (server-side Better Auth setup)
- `apps/web/src/routes/api.bookmarks.ts`
- `apps/web/src/routes/api.bookmarks.$bookmarkId.ts`
- `apps/web/src/routes/api.bookmarks.$bookmarkId.subscribe.ts` (Inngest realtime — obsolete)
- `apps/web/src/routes/api.bookmarks.$bookmarkId.tags.ts`
- `apps/web/src/routes/api.bookmarks.$bookmarkId.metadata.ts`
- `apps/web/src/routes/api.bookmarks.$bookmarkId.upload-screenshot.ts`
- `apps/web/src/routes/api.bookmarks.info.ts`
- `apps/web/src/routes/api.chat.ts`
- `apps/web/src/routes/api.chat.conversations.ts`
- `apps/web/src/routes/api.chat.conversations.$id.ts`
- `apps/web/src/routes/api.chat.conversations.$id.like.ts`
- `apps/web/src/routes/api.chat.conversations.$id.dislike.ts`
- `apps/web/src/routes/api.chat.usage.ts`
- `apps/web/src/routes/api.user.profile.ts`
- `apps/web/src/routes/api.user.avatar.ts`
- `apps/web/src/routes/api.user.public-link.ts`
- `apps/web/src/routes/api.user.limits.ts`
- `apps/web/src/routes/api.account.keys.$keyId.ts`
- `apps/web/src/routes/api.upgrade.ts`
- `apps/web/src/routes/api.exports.ts`
- `apps/web/src/routes/api.imports.ts`
- `apps/web/src/routes/api.tags.ts`
- `apps/web/src/routes/api.tags.bulk-delete.ts`
- `apps/web/src/routes/api.tags.cleanup.ts`
- `apps/web/src/routes/api.tags.management.ts`
- `apps/web/src/routes/api.tags.refactor.ts`
- `apps/web/src/routes/api.admin.users.$userId.custom-limits.ts`
- `apps/web/src/routes/api.admin.send-email.ts`
- `apps/web/src/routes/api.webhooks.stripe.ts` (moves to convex/http.ts)
- `apps/web/src/routes/api.auth.$.ts` (moves to convex/http.ts)
- `apps/web/src/routes/api.unsubscribe.$userId.ts`
- `apps/web/src/routes/api.tools.extract-content.ts`
- `apps/web/src/routes/api.tools.extract-metadata.ts`
- `apps/web/src/routes/api.tools.extract-favicons.ts`
- `apps/web/src/routes/api.tools.og-images.ts`
- `apps/web/src/routes/api.tools.youtube-metadata.ts`
- `apps/web/src/routes/api.inngest.ts`
- `apps/web/src/routes/api.mobile.checkout.ts` (if moved to convex/http.ts)
- `apps/web/src/routes/api.bug-report.ts` (if moved to convex action)
- `apps/web/src/routes/api.changelog.dismiss.ts`
- `apps/web/src/routes/api.changelog.check-dismissed.ts`

Hooks to rewrite:
- `features/app/use-bookmarks.ts`
- `features/app/bookmark-page/use-bookmark.ts` (incl. `useBookmarkToken` — delete)
- `features/app/hooks/use-bookmark-tags.ts`
- `features/app/hooks/use-tags.ts`
- `features/app/use-create-bookmark.ts`

---

## L. Risks

1. **Half-migrated state** — if UI is switched to Convex but the old Prisma handler still exists (or vice versa), data will split. Track per-feature completion with a checklist, not per-file.
2. **Infinite query pagination** — `useBookmarks` uses `upfetch` infinite query today. Convex actions return paginated results but the cursor format differs. Ensure `api.search.actions.search` returns `{ bookmarks, hasMore, cursor }` and the `getNextPageParam` logic mirrors the current one.
3. **Admin panel** — `authClient.admin.*` calls (ban/unban/impersonate/setRole) must point at `VITE_CONVEX_SITE_URL`, not the web app origin. If `auth-client.ts` `baseURL` is wrong, all admin operations silently fail.
4. **SSR vs client data mismatch** — today SSR loaders use `createServerFn` + Prisma. After migration they use `fetchAuthQuery`. The session cookie must be forwarded correctly from the TanStack Start SSR context to the Convex HTTP handler.
5. **Changelog dismiss Redis → Convex** — if dismissed state is lost during migration, users will see old changelog banners again. Low priority but document as a known regression.
6. **Tools rate limiting** — tools endpoints are currently unauthenticated. After moving to Convex actions, they need rate limiting (Phase 17) to prevent abuse, since Convex charges per action invocation.
7. **OG image SVG** — the SVG is currently served from a TanStack Start handler. If moved to `convex/http.ts`, ensure the `Content-Type: image/svg+xml` header is set correctly and the SVG escaping functions (`escapeXml`, `truncate`) are preserved exactly.
