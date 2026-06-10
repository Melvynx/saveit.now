# Phase 05 — Bookmarks & Tags CRUD

**Goal:** port bookmark + tag read/write logic from the TanStack API routes into Convex functions,
enforce plan limits, and switch the web frontend hooks from `up-fetch` / TanStack Query to native
Convex React hooks.

**Current logic to port:**
`apps/web/src/routes/api.bookmarks.ts`, `api.bookmarks.$bookmarkId.ts`,
`api.bookmarks.$bookmarkId.tags.ts`, `api.bookmarks.info.ts`, `api.tags.ts`;
`apps/web/src/lib/database/{create-bookmark,bookmark-validation,delete-bookmark}.ts`.
**Frontend hooks:** `use-bookmarks.ts`, `use-create-bookmark.ts`, `bookmark-page/use-bookmark.ts`,
`use-tags.ts`, `use-bookmark-tags.ts`.

---

## 1. Plan limits helper (shared with Phase 09)

`packages/backend/convex/billing/plans.ts` — port `auth/stripe/auth-plans.ts` + `auth-limits.ts`:
```ts
export const PLANS = {
  free: { bookmarks: 20, monthlyBookmarkRuns: 20, monthlyChatQueries: 10, canExport: 0, apiAccess: 0 },
  pro:  { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 },
};
export function getUserLimits(user, subscription) { /* plan = active sub ? "pro" : "free"; merge user.metadata.customLimits */ }
```
`packages/backend/convex/billing/limits.ts` — `assertCanCreateBookmark(ctx, user)`,
`assertCanRunProcessing(...)`, `assertCanChat(...)`: read `userCounters` + `subscriptions`, throw a
typed error (`throwLimitReached`) when exceeded, and schedule the limit-reached drip (Phase 10).

## 2. Bookmark queries

`packages/backend/convex/bookmarks/queries.ts` (use `authQuery`):
- `list({ paginationOpts, filter })` — default list via `by_user_created` (desc), `.paginate()`.
  Type/starred/read filters via the matching index. **No `.filter()`** — branch on which index to use.
  (Pure text/semantic search lives in Phase 07's search action, not here.)
- `get({ id })` — single bookmark; assert `bookmark.userId === user.id`; join tags via `by_bookmark`.
  This query is what the detail page subscribes to for **reactive processing progress**.
- `count()` — read `userCounters.bookmarkCount` (replaces `/api/bookmarks/info`).
- `getByPublicSlug({ slug })` — public, unauthenticated read for the public link feature; use a plain
  `query`, not `authQuery`. **SECURITY (Phase 17 B4): gate on `user.publicLinkEnabled === true`; return an
  explicit field WHITELIST only (title, url, type, summary, preview, faviconUrl, createdAt) and force
  `starred=false, read=false`. Never return `note`, `userId`, raw `metadata`, or embeddings.** Validate any
  `type` filter against the `BookmarkType` union.

## 3. Bookmark mutations

`packages/backend/convex/bookmarks/mutations.ts` (use `authMutation`):
- `create({ url, note?, transcript?, metadata? })` — port `create-bookmark.ts`:
  clean/validate URL, `assertCanCreateBookmark`, dedupe check via `by_user_url`, insert with
  `status: "PENDING"`, bump `userCounters.bookmarkCount`, then schedule processing:
  `ctx.scheduler.runAfter(0, internal.processing.pipeline.run, { bookmarkId, userId })` (Phase 06).
  Return the created bookmark. (PostHog `bookmark+created` event → fire from an action or skip server-side.)
- `update({ id, patch })` — title/note/star/read; assert ownership; `ctx.db.patch`.
- `remove({ id })` — assert ownership, delete `bookmarkTags` + `bookmarkOpens` rows, decrement
  counter, schedule R2 cleanup action (Phase 11), `ctx.db.delete`.
- `setStarred`, `setRead`, `recordOpen` (insert `bookmarkOpens` for the search boost).
- `reprocess({ id })` — assert ownership + `assertCanRunProcessing`, reset status to PENDING,
  schedule the pipeline again.

> `create` from the **extension** passes `transcript`/`metadata` (YouTube captions captured client-side);
> keep these optional args so the pipeline can skip re-fetching.

## 4. Tags

`packages/backend/convex/tags/{queries,mutations}.ts`:
- `tags.list({ paginationOpts })` (authQuery) — `by_user`, paginated.
- `tags.create({ name, type })` — enforce unique `(userId, name)` via `by_user_name` lookup.
- `bookmarks tags`: `setBookmarkTags({ bookmarkId, tagIds })` — diff against existing `bookmarkTags`
  (`by_bookmark`), insert/delete rows; `getBookmarkTags({ bookmarkId })`.
  Port `api.bookmarks.$bookmarkId.tags.ts`.

## 5. Wire the web frontend

Replace `up-fetch` hooks with Convex (keep hook names/signatures so components don't change much):
- `use-bookmarks.ts` → native Convex reads. Use `useQuery` / `usePaginatedQuery` for reactive list
  reads or `useConvex().query` for explicit pagination state. Filters map to the `filter` arg.
  Debounced text search routes to the **search action** (Phase 07).
- `use-create-bookmark.ts` → native Convex mutation:
  ```ts
  const create = useMutation(api.bookmarks.mutations.create);
  await create(args);
  ```
- `bookmark-page/use-bookmark.ts` → `useQuery(api.bookmarks.queries.get, { id })` —
  this replaces both `useBookmark` and the realtime `useBookmarkToken`/subscribe flow (now reactive).
- `use-tags.ts`, `use-bookmark-tags.ts` → Convex equivalents.
- Delete the now-dead routes: `api.bookmarks*.ts`, `api.tags.ts`, and the `subscribe` token route.

## Acceptance criteria
- Create → appears in list instantly (optimistic or reactive); detail page shows live status changes
  with **no** Inngest realtime token.
- Limit enforcement: free user blocked at 20 bookmarks with the proper error + drip scheduled.
- Tag add/remove reflects in list filters; tag list paginates.
- `pnpm ts` + `pnpm lint` clean in `apps/web`.

## Risks
- Counter drift if create/delete don't update `userCounters` atomically — do it in the same mutation.
- Pagination cursor format differs from the old infinite query; update the list component's
  `getNextPageParam` accordingly.
