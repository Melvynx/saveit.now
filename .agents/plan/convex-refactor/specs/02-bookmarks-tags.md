# Spec 02 — Bookmarks & Tags CRUD

**Implements:** Phase 05 of the migration plan.
**Target files:** `packages/backend/convex/bookmarks/queries.ts`, `packages/backend/convex/bookmarks/mutations.ts`, `packages/backend/convex/tags/queries.ts`, `packages/backend/convex/tags/mutations.ts`, `packages/backend/convex/billing/plans.ts`, `packages/backend/convex/billing/limits.ts`.
**"use node" required:** None for CRUD mutations/queries. Only actions that call Node-specific APIs (Gemini, R2) need it — those are in Phase 06/11.

---

## 1. Source Files and Their Responsibilities

### 1.1 `apps/web/src/routes/api.bookmarks.ts`
- `GET /api/bookmarks` — authenticated list/search. Accepts query params `query`, `types`, `tags`, `special`, `limit` (1–50, default 20), `cursor`, `matchingDistance` (default 0.1). Routes to `cachedAdvancedSearch` which hits Redis cache then an optimized Postgres query. Returns `{ bookmarks: SearchResult[], hasMore: boolean, nextCursor? }`.
- `POST /api/bookmarks` — create bookmark. Parses body via `parseBookmarkBody` (supports JSON and multipart/form-data with image upload to R2). Calls `createBookmark(url, userId, transcript?, metadata?)`. Returns `{ status: "ok", bookmark }`.

### 1.2 `apps/web/src/routes/api.bookmarks.$bookmarkId.ts`
- `GET /api/bookmarks/:bookmarkId` — get one bookmark by ID, asserting ownership via `userId` filter in query. Uses `getUserBookmark`. Returns `{ bookmark }`.
- `PATCH /api/bookmarks/:bookmarkId` — update `starred`, `read`, `note`, or `status`. Validates `read` is only settable when `type` is `ARTICLE` or `YOUTUBE`. Setting `status: "PENDING"` fires Inngest `bookmark/process` event (reprocess). Returns `{ bookmark }` with full `tags` join.
- `DELETE /api/bookmarks/:bookmarkId` — delete via `deleteBookmark(id, userId)`. Returns `{ success: true, bookmark }`.

### 1.3 `apps/web/src/routes/api.bookmarks.$bookmarkId.tags.ts`
- `GET /api/bookmarks/:bookmarkId/tags` — returns `{ tags: [{id, name, type}] }` for a bookmark. Asserts ownership via `userId` in Prisma where clause.
- `PATCH /api/bookmarks/:bookmarkId/tags` — accepts `{ tags: string[] }` (array of tag names). Implements a full diff: deduplicates input names (Set + trim), computes `tagsToAdd` and `tagsToRemove` by comparing against current tag names. For each removal, looks up tag by `userId_name` unique index and deletes the `BookmarkTag` join row. For each addition, upserts the `Tag` by `(userId, name)` (creating with `type: "USER"` if new), then inserts `BookmarkTag`. Returns final `{ tags }`.

### 1.4 `apps/web/src/routes/api.bookmarks.$bookmarkId.metadata.ts`
- `GET /api/bookmarks/:bookmarkId/metadata` — fetches live HTML from `bookmark.url`, extracts `<title>` and favicon using cheerio, falls back to stored values. Returns `{ title, faviconUrl }`.

### 1.5 `apps/web/src/routes/api.bookmarks.info.ts`
- `GET /api/bookmarks/info` — returns `{ bookmarksCount: number }` by doing a direct `prisma.bookmark.count({ where: { userId } })`.

### 1.6 `apps/web/src/routes/api.tags.ts`
- `GET /api/tags` — cursor-paginated list of user tags. Params: `q` (optional, case-insensitive name search), `cursor` (id gt), `limit` (max 50, default 10). Returns `{ tags, nextCursor, hasNextPage }`.
- `POST /api/tags` — create tag with `{ name }`, userId, `type: "USER"`. Returns `{ success: true, tag: {id, name, type} }`.

### 1.7 `apps/web/src/routes/api.tags.bulk-delete.ts`
- `POST /api/tags/bulk-delete` — accepts `{ tagIds: string[] }` (min 1). Runs in a Prisma transaction: verifies all tags belong to the user (if count mismatch, throws), then `deleteMany` on `BookmarkTag` (by tagId), then `deleteMany` on `Tag`. Returns `{ success, deletedTags: [{id,name}], totalBookmarksAffected }`.

### 1.8 `apps/web/src/routes/api.tags.cleanup.ts`
- `POST /api/tags/cleanup` — AI-powered tag consolidation suggestions. Fetches all user tags (with bookmark counts, sorted by bookmark count desc), passes the names to `generateTagCleanupSuggestions` (Gemini `generateObject`), enriches suggestions with tag metadata. Returns `{ suggestions, totalTags }`.

### 1.9 `apps/web/src/routes/api.tags.management.ts`
- `GET /api/tags/management` — management variant with bookmark counts (`_count.bookmarks`), sorted by bookmark count desc. Params: `q`, `cursor`, `limit` (max 50, default 20). Returns `{ tags: [{id, name, type, _count: {bookmarks}}], nextCursor, hasNextPage }`.

### 1.10 `apps/web/src/routes/api.tags.refactor.ts`
- `POST /api/tags/refactor` — bulk tag merge operation. Accepts `{ refactors: [{bestTag, refactorTagIds, createBestTag}] }` (min 1 operation). Each operation: verifies source tags exist and belong to user, finds/creates best tag, re-points `BookmarkTag` join rows from source tag IDs to best tag ID (skipping existing joins), deletes source `BookmarkTag` rows, deletes source `Tag` rows. Returns `{ success, results, summary: {operationsApplied, totalBookmarksAffected, totalTagsRemoved} }`.

### 1.11 `apps/web/src/lib/database/create-bookmark.ts`
Central bookmark creation orchestrator:
1. `cleanUrl(body.url)` — strips tracking params.
2. `validateBookmarkLimits({ userId, url: cleanedUrl })` — throws `BookmarkValidationError` if limits exceeded or duplicate.
3. Merges `transcript` into `metadata` if present (`transcript`, `transcriptSource: "extension"`, `transcriptExtractedAt: new Date().toISOString()`).
4. `prisma.bookmark.create({ data: { url: cleanedUrl, userId, metadata } })`.
5. Fires Inngest `bookmark/process` (async, ignores errors).
6. PostHog `bookmark+created` event.
7. `SearchCache.invalidateBookmarkUpdate(userId)`.

### 1.12 `apps/web/src/lib/database/bookmark-validation.ts`
`validateBookmarkLimits(options: { userId, url, skipExistenceCheck? })`:
1. Fetches subscription (`status: active | trialing`), resolves plan and custom limits via `getAuthLimits`.
2. Counts total bookmarks — if `plan === "free"` and count >= `limits.bookmarks - 1`, checks `hasLimitEmailBeenSent`; if not sent, fires Inngest `marketing/email-on-limit-reached`.
3. If `totalBookmarks >= limits.bookmarks`, throws `BookmarkValidationError("You have reached the maximum number of bookmarks", BookmarkErrorType.MAX_BOOKMARKS)`.
4. Counts monthly `BookmarkProcessingRun` since `startOf("month")`. If `>= limits.monthlyBookmarkRuns`, throws `BookmarkValidationError("You have reached the maximum number of bookmark processing runs for this month", BookmarkErrorType.MAX_BOOKMARKS)`.
5. Unless `skipExistenceCheck`, queries for existing bookmark by `(url, userId)`. If found, throws `BookmarkValidationError("Bookmark already exists", BookmarkErrorType.BOOKMARK_ALREADY_EXISTS)`.

### 1.13 `apps/web/src/lib/database/delete-bookmark.ts`
1. Queries `bookmark.findUnique({ where: { id, userId } })` — throws `SafeRouteError("Bookmark not found", 404)` if not found.
2. `prisma.bookmark.delete({ where: { id, userId } })`.
3. `deleteFileFromS3({ key: "users/${userId}/bookmarks/${id}" })`.
4. `SearchCache.invalidateBookmarkUpdate(userId)`.

### 1.14 `apps/web/src/lib/database/get-bookmark.ts`
`getUserBookmark(bookmarkId, userId)` — selects: `id, userId, url, title, faviconUrl, summary, note, preview, ogImageUrl, ogDescription, type, metadata, status, createdAt, updatedAt, starred, read, tags[].tag{id,name,type}`.

`getUserBookmarksByIds(bookmarkIds, userId)` — batch fetch with same select.

`getPublicBookmark(bookmarkId)` — no userId filter (used for public access; caller must gate).

### 1.15 `apps/web/src/lib/auth-limits.ts`
Defines `AUTH_LIMITS`:
```
free: { bookmarks: 20, monthlyBookmarkRuns: 20, monthlyChatQueries: 10, canExport: 0, apiAccess: 0 }
pro:  { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 }
```
`getAuthLimits(subscription?, metadata?)` — picks plan by `subscription.plan` (defaults to "free"), then merges `parseCustomAuthLimits(metadata)` (reads `metadata.customLimits` object, validates each key is a non-negative integer). Custom limits take precedence over plan limits.

`AUTH_LIMIT_KEYS`: `["bookmarks", "monthlyBookmarkRuns", "monthlyChatQueries", "canExport", "apiAccess"]`.

### 1.16 `apps/web/src/lib/utils/url-cleaner.ts`
`cleanUrl(url: string): string` — parses URL, removes the following tracking query parameters (deletes from `URLSearchParams`), returns cleaned URL string. Falls back to original URL if parsing fails.

**Complete list of removed params (must preserve exactly):**
```
utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id,
utm_source_platform, utm_creative_format, utm_marketing_tactic,
fbclid, fb_action_ids, fb_action_types, fb_ref, fb_source,
gclid, gclsrc, dclid, gbraid, wbraid,
igshid, igsh,
ref_src, ref_url, twclid,
li_source, li_medium, li_campaign, li_content, li_term, trk,
mc_cid, mc_eid, ck_subscriber_id, campaign_id, tracking_id, source_id, email_id,
msclkid, ms_c,
tt_medium, tt_content, ttclid,
epik,
feature, kw,
ref, referer, source, medium, campaign, content, term,
affiliate_id, partner_id, click_id, impression_id, ad_id, creative_id,
placement_id, site_id, network_id, sub_id, pub_id, aff_id,
cid, sid, tid, pid, aid, oid, vid, rid, uid, lid, mid
```

### 1.17 `apps/web/src/lib/ai-tag-cleanup.ts`
`generateTagCleanupSuggestions(tagNames: string[]): Promise<TagCleanupSuggestion[]>`:
- Short-circuits and returns `[]` if `tagNames.length < 2`.
- Calls Gemini `generateObject` with model `GEMINI_MODELS.normal` (`gemini-3.1-pro-preview`) + `TagCleanupResponseSchema`.
- **System prompt (verbatim):**
  ```
  You are a tag organization expert. Analyze the provided tags and identify consolidation opportunities to reduce redundancy while maintaining semantic meaning.

  Look for:
  1. Semantic duplicates (react vs React vs ReactJS vs react.js)
  2. Abbreviations vs full names (js vs javascript, css vs cascading-style-sheets)
  3. Formatting inconsistencies (kebab-case vs camelCase vs snake_case)
  4. Plural vs singular forms (tag vs tags, component vs components)
  5. Similar technologies that could be grouped (reactjs vs react.js vs "react js")

  Rules:
  - Only suggest consolidations when tags are clearly related/similar
  - Choose the most common/standard form as bestTag
  - Don't consolidate conceptually different tags (react and vue are different)
  - Prefer lowercase, kebab-case format when possible
  - Only include refactorTags that actually exist in the input
  - Each refactorTag should only appear once across all suggestions
  - Minimum 2 tags per consolidation group

  Return empty suggestions array if no clear consolidations are found.
  ```
- **User prompt (verbatim):** `"Analyze these tags for consolidation opportunities:\n\nTags: ${tagNames.join(", ")}\n\nIdentify which tags should be consolidated and suggest the best canonical form for each group."`
- Post-processes: filters out suggestions where all `refactorTags` don't exist in original names, keeps only those with `validRefactorTags.length >= 1`.

### 1.18 Frontend hooks

**`apps/web/src/features/app/use-bookmarks.ts`**
- `useBookmarks({ enabled? })` — `useInfiniteQuery` over `GET /api/bookmarks`. Reads URL search params (`query`, `types`, `tags`, `special`, `matchingDistance`). Debounces `query`. Short-circuits with empty result if `query` is a valid URL. `limit: 20`, `cursor: pageParam`. `getNextPageParam` returns last bookmark ID or `undefined`. Flattens pages to `bookmarks[]`. Detects typing state.
- `useRefreshBookmarks()` — invalidates all queries where `queryKey[0] === "bookmarks"`.
- `usePrefetchBookmarks()` — prefetches with given `query` and `matchingDistance`.

**`apps/web/src/features/app/use-create-bookmark.ts`**
- `useCreateBookmarkAction({ onSuccess? })` — `useMutation` over `POST /api/bookmarks`. On error, branches on `error.type === BookmarkErrorType.MAX_BOOKMARKS` (shows upgrade toast) and `BookmarkErrorType.BOOKMARK_ALREADY_EXISTS`. On success, calls `refreshBookmarks()`.

**`apps/web/src/features/app/bookmark-page/use-bookmark.ts`**
- `useBookmark(bookmarkId?)` — `useQuery` over `GET /api/bookmarks/:id`. Returns `{ bookmark }` wrapped.
- `useBookmarkMetadata(bookmarkId?)` — queries `GET /api/bookmarks/:id/metadata`. Returns `{ title, faviconUrl }`.
- `useBookmarkToken(bookmarkId?)` — queries `GET /api/bookmarks/:id/subscribe` (Inngest realtime — to be **removed** in Convex migration).
- `useRefreshBookmark(bookmarkId?)` — invalidates `["bookmark", bookmarkId]`.
- `usePrefetchBookmark()` — prefetches single bookmark.

`BookmarkSchema` (the frontend DTO shape the component depends on):
```ts
{
  id: string,
  url: string (URL),
  title?: string | null,
  faviconUrl?: string | null,
  summary?: string | null,
  preview?: string | null,
  ogImageUrl?: string | null,
  note?: string | null,
  type: BookmarkType | null,
  metadata?: any | null,
  starred?: boolean,
  read?: boolean,
  tags: Array<{ tag: { id: string, name: string, type: string } }>
}
```

**`apps/web/src/features/app/hooks/use-tags.ts`** (feature hooks for the app, NOT the simple `features/tags/use-tags.ts`)
- `useTags(query?)` — non-infinite query over `GET /api/tags?q=...`. Returns single page. Debounces `query` by 300ms. Manages `selectedTags` in URL state (nuqs, serialized as comma-separated). Exposes `addTag`, `removeTag`, `clearTags`.
- `useInfiniteTags(query?)` — infinite variant over `GET /api/tags` with `cursor` and `limit: 10`. Same URL state management.

**`apps/web/src/features/app/hooks/use-bookmark-tags.ts`**
- `useBookmarkTags(bookmarkId?)` — query + mutation pair. Fetches from `GET /api/bookmarks/:id/tags`, mutates via `PATCH /api/bookmarks/:id/tags` with `{ tags: string[] }`. Implements optimistic update (temp tag IDs `temp-${name}`), rollback on error. Exposes `updateTags(tagNames[])`, `addTag(name)`, `removeTag(name)`, `toggleTag(name)`. On success, also updates `["bookmark", id]` cache and invalidates `["bookmarks", *]` list queries.

---

## 2. Business Logic to Preserve

### 2.1 URL Cleaning (must run before validation)
The `cleanUrl` function in section 1.16 must be ported verbatim with all 58+ tracking parameters. It is called as the first step in `createBookmark` before any validation or database write.

### 2.2 Bookmark Creation Flow (exact ordering)
```
1. cleanUrl(url)
2. validateBookmarkLimits({ userId, url: cleanedUrl })
   a. Fetch subscription (active/trialing only)
   b. getAuthLimits(subscription, userMetadata)  — merges custom limits
   c. Count total bookmarks (userCounters.bookmarkCount in Convex)
   d. Check total limit → if plan=free AND approaching limit → fire drip email (once)
   e. If totalBookmarks >= limits.bookmarks → throw MAX_BOOKMARKS error
   f. Count monthly processing runs (startOf month)
   g. If monthlyRuns >= limits.monthlyBookmarkRuns → throw MAX_BOOKMARKS error
   h. Check duplicate (userId, url) → throw BOOKMARK_ALREADY_EXISTS
3. Merge transcript into metadata if present
4. Insert bookmark (status: PENDING, starred: false, read: false)
5. Increment userCounters.bookmarkCount
6. ctx.scheduler.runAfter(0, processing.pipeline.run, { bookmarkId, userId })
7. [Optional] PostHog event bookmark+created
```

The limit email drip logic (step 2d): send when `plan === "free"` AND `limits.bookmarks <= AUTH_LIMITS.free.bookmarks` (no custom limit override) AND `totalBookmarks >= limits.bookmarks - 1` (i.e., at 19/20 bookmarks). In Convex, schedule a marketing email action instead of Inngest `marketing/email-on-limit-reached`. Track whether sent in user metadata (`limitEmailSentAt` field).

### 2.3 Duplicate Detection
Exact match on `(userId, url)` after URL cleaning. The `by_user_url` index enables this. Throws `BOOKMARK_ALREADY_EXISTS` error type — the frontend shows a specific toast for this.

### 2.4 Monthly Run Quota
Count `bookmarkProcessingRuns` in the current calendar month (UTC start of month). Limit: `limits.monthlyBookmarkRuns` (free: 20, pro: 1500). This is checked at **create time**, not just at processing time. In Convex, use `by_user_started` index with range filter for the current month key.

### 2.5 Update Rules for `read` Field
The `read` field can only be set on bookmarks where `type` is `ARTICLE` or `YOUTUBE`. Any PATCH request attempting to set `read` on other types must return 400 with `"Bookmark does not support read functionality"`. The allowed readable types:
```
const READABLE_BOOKMARK = ["ARTICLE", "YOUTUBE"] satisfies BookmarkType[]
```

### 2.6 Reprocess (status: PENDING)
When a PATCH sets `status: "PENDING"`, the backend must also trigger reprocessing. In Convex this becomes `ctx.scheduler.runAfter(0, internal.processing.pipeline.run, { bookmarkId, userId })` inside the `update` mutation.

### 2.7 Delete Cleanup
On bookmark deletion:
1. Delete all `bookmarkTags` rows for the bookmark (use `by_bookmark` index).
2. Delete all `bookmarkOpens` rows for the bookmark.
3. Decrement `userCounters.bookmarkCount`.
4. Schedule R2 cleanup action for key `users/${userId}/bookmarks/${bookmarkId}` (Phase 11).
5. `ctx.db.delete(bookmarkId)`.

### 2.8 setBookmarkTags Diff Algorithm
The PATCH tags endpoint takes a desired final state as a list of tag **names**. The algorithm:
1. Trim and deduplicate input names (filter empty strings, `Array.from(new Set(names.map(n => n.trim())))`).
2. Fetch current `bookmarkTags` for the bookmark via `by_bookmark` index, resolve tag names.
3. `tagsToAdd = desiredNames.filter(name => !currentNames.includes(name))`
4. `tagsToRemove = currentNames.filter(name => !desiredNames.includes(name))`
5. For each `tagsToRemove`: look up tag by `by_user_name` index, delete the `bookmarkTags` join row.
6. For each `tagsToAdd`: look up tag by `by_user_name` index. If not found, insert new tag `(userId, name, type: "USER")`. Insert `bookmarkTags` join row `(bookmarkId, tagId, userId)`.
7. Return final tag list.

### 2.9 Tag Uniqueness
Tags are unique per `(userId, name)`. The `by_user_name` index enforces this. When creating a new tag, always check the index first and throw (or return existing) if a duplicate exists. The `tags.create` mutation must check `by_user_name` before inserting.

### 2.10 Bulk Tag Delete
When deleting tags in bulk:
1. Verify all tagIds belong to the user (count must match `tagIds.length`). Throw error if any are foreign.
2. Delete all `bookmarkTags` join rows for those tagIds (`by_tag` index).
3. Delete the `tags` rows.
All three steps must be treated atomically — in Convex this is handled naturally within a single mutation (mutations are transactions).

### 2.11 Tag Refactor (Merge)
For each refactor operation `{ bestTag, refactorTagIds, createBestTag }`:
1. Verify source tags exist and belong to user.
2. Find best tag by `(userId, name)`. If not found and `createBestTag: true`, create it with `type: "USER"`. If not found and `createBestTag: false`, throw `"Best tag '${bestTag}' doesn't exist. Set createBestTag to true to create it."`.
3. Find all `bookmarkTags` rows where `tagId IN refactorTagIds`.
4. Get unique `bookmarkIds` from those join rows.
5. For each `bookmarkId`, check if `bookmarkTags` row with `bestTag.id` already exists; if not, insert it.
6. Delete all `bookmarkTags` rows where `tagId IN refactorTagIds`.
7. Delete source tags.
8. Collect result `{ bestTag, refactoredTags: sourceTagNames[], bookmarksAffected, tagsRemoved, created }`.

---

## 3. External API / SDK Calls

### 3.1 Gemini (ai-tag-cleanup action only)
- Provider: `@ai-sdk/google` / `createGoogleGenerativeAI`
- Model: `gemini-3.1-pro-preview` (mapped to `GEMINI_MODELS.normal`)
- Call: `generateObject({ model, schema: TagCleanupResponseSchema, system, prompt })`
- Env var: `GOOGLE_GENERATIVE_AI_API_KEY`
- Used in: `tags/actions.ts` → `suggestCleanup` action (must use `"use node"` if using Node SDK bindings; check if Vercel AI SDK `@ai-sdk/google` works in Convex runtime)

### 3.2 AWS S3 / Cloudflare R2
- Bookmark delete triggers `deleteFileFromS3({ key: "users/${userId}/bookmarks/${bookmarkId}" })`.
- Key format: `users/${userId}/bookmarks/${bookmarkId}` (no file extension — folder/prefix cleanup).
- Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_ENDPOINT`, `R2_URL`.
- R2 cleanup is currently synchronous in the delete handler; in Convex, schedule as an `internal` action via `ctx.scheduler`.

### 3.3 PostHog (analytics, fire-and-forget)
- Event: `bookmark+created` with properties `{ url, hasTranscript: boolean, transcriptSource?: "extension" }`
- In Convex, can be skipped or done from a scheduled action; it must not block the create mutation.

---

## 4. Validation Rules and Security Guards

### 4.1 URL Validation
- Must be parseable by `new URL(url)`. If parsing fails, return 400 `"Invalid URL format"`.
- URL is cleaned before validation (tracking params stripped).
- When `content-type: multipart/form-data` with an image file, the image is uploaded to R2 and the S3 URL becomes the bookmark URL (for image-type bookmarks from mobile).

### 4.2 Limit Enforcement Checks (Phase 17 §B1/B2 — typed errors)
- `assertCanCreateBookmark(ctx, userId)` must throw `throwLimitReached("MAX_BOOKMARKS", "You have reached the maximum number of bookmarks")` using the `convex/utils/errors.ts` typed error helper when `bookmarkCount >= limits.bookmarks`.
- `assertCanRunProcessing(ctx, userId)` must throw when monthly run count >= `limits.monthlyBookmarkRuns`.
- The client branches on error `code === "MAX_BOOKMARKS"` to show the upgrade toast.

### 4.3 Ownership Checks (every bookmark read/write)
- Every query or mutation on a bookmark must filter/assert `bookmark.userId === user._id` (where `user._id` comes from `authQuery/authMutation`). Never trust a client-passed userId.
- Every tag read/write must filter/assert `tag.userId === user._id`.
- Failure: throw `throwNotFound("Bookmark not found")` (not 403, to avoid leaking existence).

### 4.4 Banned User Check
Per Phase 17 §B2, the `authMutation`/`authQuery` builders must check `user.banned === true` before executing any handler. This is in the builder layer, not in individual functions.

### 4.5 `read` Field Type Guard
- Setting `read` is only valid for `type: "ARTICLE"` or `type: "YOUTUBE"`.
- On PATCH, if `body.read !== undefined && !["ARTICLE", "YOUTUBE"].includes(bookmark.type)`, throw `throwValidationError("Bookmark does not support read functionality")`.

### 4.6 Tag Name Validation
- Tag names must be non-empty strings after trimming.
- Tag names are stored as-is (no forced lowercase) — current behavior preserves case.
- Enforce `(userId, name)` uniqueness via index lookup before insert.

### 4.7 Public DTO Whitelist (Phase 17 §B4)
`getByPublicSlug` must:
- Only execute if `user.publicLinkEnabled === true`. If false, throw `throwNotFound`.
- Return ONLY: `title, url, type, summary, preview, faviconUrl, createdAt`.
- Force `starred = false, read = false` in response regardless of actual values.
- Never return: `note`, `userId`, raw `metadata`, `searchEmbedding`, `vectorSummary`, `processingError`.
- Validate `type` filter input against the `BookmarkType` union (VIDEO, ARTICLE, PAGE, IMAGE, YOUTUBE, TWEET, PDF, PRODUCT).

### 4.8 Bulk Operation Ownership
For `bulkDeleteTags` and `refactorTags`, all source IDs must be verified to belong to the current user before any writes. If any ID is not found or belongs to another user, throw an error and abort the entire operation.

### 4.9 Input Bounds
Per Phase 17 §B5, all HTTP actions and mutations must validate input bounds:
- `limit`: 1–50 for internal list queries, 1–100 for v1 API.
- `matchingDistance`: 0.1–2.0.
- Tag names: non-empty, max reasonable length (suggest 100 chars).
- `tagIds` array: min 1 for bulk operations.

---

## 5. Target Convex Functions

### 5.1 `packages/backend/convex/billing/plans.ts`
```ts
// No "use node" needed
export const PLANS = {
  free: { bookmarks: 20, monthlyBookmarkRuns: 20, monthlyChatQueries: 10, canExport: 0, apiAccess: 0 },
  pro:  { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 },
};
export function getUserLimits(plan: "free" | "pro", customLimits?: Partial<typeof PLANS.free>): typeof PLANS.free {
  return { ...PLANS[plan], ...customLimits };
}
```

### 5.2 `packages/backend/convex/billing/limits.ts`
```ts
// internal helpers — not "use node"
export async function assertCanCreateBookmark(ctx, user): Promise<void>
// Reads userCounters (by_user index), subscriptions (by_user), throws throwLimitReached

export async function assertCanRunProcessing(ctx, user): Promise<void>
// Reads bookmarkProcessingRuns for current month key (by_user_started), throws throwLimitReached

export async function shouldSendLimitEmail(ctx, user): Promise<boolean>
// Returns true if plan=free, bookmarkCount >= limits.bookmarks - 1, and limitEmailSentAt not set
```

### 5.3 `packages/backend/convex/bookmarks/queries.ts`
All use `authQuery`:
```
list({ paginationOpts, filter?: { types?, starred?, read?, tagIds? } })
  → paginated list via by_user_created (desc) + index switching for filters
  → joins tags via by_bookmark
  
get({ id: Id<"bookmarks"> })
  → single bookmark + tags; asserts userId ownership
  → this is the reactive subscription point for the detail page

count()
  → reads userCounters.bookmarkCount (exact, denormalized)

getByPublicSlug({ slug: string, type?: BookmarkType })
  → plain `query` (NOT authQuery) — unauthenticated
  → enforces publicLinkEnabled + field whitelist (B4)
```

### 5.4 `packages/backend/convex/bookmarks/mutations.ts`
All use `authMutation`:
```
create({ url: string, note?: string, transcript?: string, metadata?: any })
  → cleanUrl → assertCanCreateBookmark → dedupeCheck → insert → bumpCounter → scheduleProcessing

update({ id: Id<"bookmarks">, patch: { starred?, read?, note?, status? } })
  → ownership check → read-type guard → db.patch → if status=PENDING: scheduleProcessing

remove({ id: Id<"bookmarks"> })
  → ownership check → delete bookmarkTags → delete bookmarkOpens → decrementCounter → scheduleR2Cleanup → db.delete

setStarred({ id: Id<"bookmarks">, starred: boolean })
  → ownership check → db.patch({ starred })

setRead({ id: Id<"bookmarks">, read: boolean })
  → ownership check → readable-type guard → db.patch({ read })

recordOpen({ id: Id<"bookmarks"> })
  → ownership check → db.insert("bookmarkOpens", { bookmarkId: id, userId, openedAt: Date.now() })

reprocess({ id: Id<"bookmarks"> })
  → ownership check → assertCanRunProcessing → db.patch({ status: "PENDING", processingStep: 0 }) → scheduleProcessing
```

### 5.5 `packages/backend/convex/tags/queries.ts`
```
list({ paginationOpts, query?: string })  [authQuery]
  → by_user index, paginated
  → no text search (Convex has no native case-insensitive contains; do client-side filter or use searchIndex)
  
getByBookmark({ bookmarkId: Id<"bookmarks"> })  [authQuery]
  → by_bookmark index on bookmarkTags, joins tag name/type
  → asserts bookmark ownership before returning
  
listManagement({ paginationOpts, query?: string })  [authQuery]
  → by_user index, paginated; enriches each tag with bookmark count via by_tag index
  → sorted by bookmark count desc (requires post-query sort since Convex indexes can't sort by derived count)
```

### 5.6 `packages/backend/convex/tags/mutations.ts`
```
create({ name: string, type?: "USER" | "IA" })  [authMutation]
  → check by_user_name for existing (userId, name) → throw if exists → db.insert

setBookmarkTags({ bookmarkId: Id<"bookmarks">, tagIds: Id<"tags">[] })  [authMutation]
  → ownership check on bookmark
  → ownership check: all tagIds must belong to userId
  → fetch current bookmarkTags via by_bookmark
  → diff: compute idsToAdd, idsToRemove
  → delete removed rows, insert added rows

setBookmarkTagsByName({ bookmarkId: Id<"bookmarks">, tagNames: string[] })  [authMutation]
  → trim/dedup names → fetch current bookmarkTags (by_bookmark) → resolve names to IDs
  → for each toAdd: upsert tag by_user_name, insert bookmarkTags row
  → for each toRemove: find tag id by_user_name, delete bookmarkTags row

remove({ id: Id<"tags"> })  [authMutation]
  → ownership check → delete bookmarkTags (by_tag) → db.delete

bulkDelete({ tagIds: Id<"tags">[] })  [authMutation]
  → verify all belong to user → for each: delete bookmarkTags (by_tag), delete tag

refactor({ refactors: Array<{bestTag:string, refactorTagIds:Id<"tags">[], createBestTag?:boolean}> })  [authMutation]
  → for each operation: verify sources belong to user, find/create best tag, re-point joins, delete sources
```

### 5.7 `packages/backend/convex/tags/actions.ts`
```
suggestCleanup()  [authAction — requires "use node" for Gemini SDK]
  → fetch all user tags with counts (via internal query)
  → if < 2 tags, return []
  → call Gemini generateObject with system prompt + user prompt (verbatim from section 1.17)
  → post-process and return { suggestions, totalTags }
```

---

## 6. Response DTO Shapes the Frontend Depends On

### 6.1 Bookmark List (`GET /api/bookmarks` and `GET /api/v1/bookmarks`)
```json
{
  "bookmarks": [
    {
      "id": "string",
      "url": "string",
      "title": "string|null",
      "summary": "string|null",
      "preview": "string|null",
      "type": "VIDEO|ARTICLE|PAGE|IMAGE|YOUTUBE|TWEET|PDF|PRODUCT|null",
      "status": "PENDING|PROCESSING|READY|ERROR",
      "ogImageUrl": "string|null",
      "ogDescription": "string|null",
      "faviconUrl": "string|null",
      "score": 0,
      "matchType": "tag|vector|combined",
      "matchedTags": ["string"],
      "tags": [{ "tag": { "id": "string", "name": "string", "type": "string" } }],
      "createdAt": "Date",
      "metadata": {},
      "openCount": 0,
      "starred": false,
      "read": false
    }
  ],
  "hasMore": false,
  "nextCursor": "string|undefined"
}
```
Note: `metadata` has `transcript` stripped from the response (see `cleanMetadata` in search-helpers.ts). The Convex list query should not return transcript in metadata.

### 6.2 Single Bookmark (`GET /api/bookmarks/:id`)
```json
{
  "bookmark": {
    "id": "string",
    "userId": "string",
    "url": "string",
    "title": "string|null",
    "faviconUrl": "string|null",
    "summary": "string|null",
    "note": "string|null",
    "preview": "string|null",
    "ogImageUrl": "string|null",
    "ogDescription": "string|null",
    "type": "BookmarkType|null",
    "metadata": "any|null",
    "status": "BookmarkStatus",
    "createdAt": "Date",
    "updatedAt": "Date",
    "starred": "boolean",
    "read": "boolean",
    "tags": [{ "tag": { "id": "string", "name": "string", "type": "string" } }]
  }
}
```

### 6.3 Create Bookmark Response
Internal app: `{ status: "ok", bookmark: <full bookmark> }`
v1 API: `{ success: true, bookmark: { id, url, title, summary, type, status, starred, read, createdAt, updatedAt } }`

### 6.4 Bookmark Tags
```json
{ "tags": [{ "id": "string", "name": "string", "type": "USER|IA" }] }
```

### 6.5 Tags List
```json
{
  "tags": [{ "id": "string", "name": "string", "type": "USER|IA" }],
  "nextCursor": "string|null",
  "hasNextPage": true
}
```

### 6.6 Tag Management List
```json
{
  "tags": [
    {
      "id": "string",
      "name": "string",
      "type": "USER|IA",
      "_count": { "bookmarks": 0 }
    }
  ],
  "nextCursor": "string|null",
  "hasNextPage": true
}
```

### 6.7 Bookmarks Info
```json
{ "bookmarksCount": 42 }
```
In Convex: `count()` query reads `userCounters.bookmarkCount`.

### 6.8 Bulk Delete Tags
```json
{
  "success": true,
  "deletedTags": [{ "id": "string", "name": "string" }],
  "totalBookmarksAffected": 0
}
```

### 6.9 Tag Refactor
```json
{
  "success": true,
  "results": [
    {
      "bestTag": "string",
      "refactoredTags": ["string"],
      "bookmarksAffected": 0,
      "tagsRemoved": 0,
      "created": false
    }
  ],
  "summary": {
    "operationsApplied": 1,
    "totalBookmarksAffected": 0,
    "totalTagsRemoved": 0
  }
}
```

### 6.10 Random Bookmark (`GET /api/v1/bookmarks/random`)
```json
{
  "success": true,
  "bookmark": {
    "id", "url", "title", "summary", "type", "status", "starred", "read",
    "preview", "faviconUrl", "ogImageUrl", "ogDescription", "createdAt",
    "tags": ["string"]  // flat array of tag names, NOT objects
  },
  "remaining": 0
}
```
Logic: excludes bookmarks the user has previously opened (distinct bookmarkIds from `bookmarkOpens`), counts remaining, picks a random one (`skip: Math.floor(Math.random() * totalAvailable)`), records the open in `bookmarkOpens`, returns with `remaining` count.

### 6.11 Tag Cleanup Suggestions
```json
{
  "suggestions": [
    {
      "bestTag": "string",
      "bestTagExists": true,
      "bestTagId": "string|undefined",
      "bestTagBookmarkCount": 0,
      "refactorTags": [{ "id": "string", "name": "string", "bookmarkCount": 0 }],
      "totalBookmarks": 0
    }
  ],
  "totalTags": 0
}
```

---

## 7. Pagination Strategy

### 7.1 Default Browsing (no query/tags/types filter)
Current: cursor is the last bookmark's ULID `id` (lexicographically sortable by creation time). Query uses `id: { lt: cursor }` for the next page, ordered by `id DESC`.

Convex equivalent: `.withIndex("by_user_created", q => q.eq("userId", userId)).order("desc").paginate(paginationOpts)`. The Convex `paginationOpts` cursor replaces the ULID cursor. The frontend must adapt `getNextPageParam` to use the Convex paginator's `continueCursor`.

### 7.2 Filtered Browsing (type/starred/read filter, no text query)
Current: same cursor approach within a filtered Prisma query.

Convex equivalent: use matching index:
- Type filter: `by_user_status` (if filtering by status) or a post-filter on `by_user_created` (acceptable for small result sets). Note: Convex cannot sort by a non-indexed field after filtering. The implementation must choose the right index based on which filter is active.
- Starred: `by_user_starred` index.
- Read: `by_user_read` index.
- Type-only: no dedicated Convex index — paginate `by_user_created` and post-filter, or add a `by_user_type` index (may need schema addition in Phase 04).

### 7.3 Search (text/semantic query)
Current: cursor is a numeric offset (integer string) in `optimizedSearch`, or a bookmark ID in the advanced search fallback.

Convex equivalent: search and vector search in Phase 07 — not handled by the CRUD queries. The `list` query in Phase 05 only handles browsing/filtering without text search. Text search routes to the search action.

### 7.4 Tag Pagination
Current: cursor is the last tag's `id` (gt), ordered by `id ASC`.

Convex equivalent: `.withIndex("by_user", q => q.eq("userId", userId)).paginate(paginationOpts)`. Tag management sorts by bookmark count desc — this requires fetching and sorting in memory (or adding a count field to the tag document).

---

## 8. `userCounters` Table (Denormalized Counter)

The schema (from Phase 04) defines:
```ts
userCounters: defineTable({
  userId: v.string(),
  bookmarkCount: v.number(),
  monthKey: v.string(),          // e.g. "2025-06"
  monthlyRuns: v.number()
}).index("by_user", ["userId"])
```

Rules:
- `create` bookmark: increment `bookmarkCount` and `monthlyRuns` in the same mutation.
- `remove` bookmark: decrement `bookmarkCount` in the same mutation.
- `reprocess` bookmark: increment `monthlyRuns` (new processing run scheduled).
- When `userCounters` doc doesn't exist for a user, create it (upsert pattern in Convex: query first, then insert or patch).
- `monthKey` format: `"YYYY-MM"` (e.g. `"2025-06"`). When the current month changes, reset `monthlyRuns` to 0 and update `monthKey` — or query `bookmarkProcessingRuns` filtered to current month if `monthKey` is stale.

Counter drift risk (from Phase 05): create and decrement must happen in the **same mutation** as the bookmark insert/delete to remain atomic.

---

## 9. Edge Cases and Known Gotchas

### 9.1 Tag `setBookmarkTagsByName` vs `setBookmarkTags`
The current API accepts **tag names** (strings), not tag IDs. The Convex mutation must upsert tags by name before creating join rows. This is different from `setBookmarkTags` which takes `Id<"tags">[]`. Both variants are needed:
- Internal use (AI tagging in pipeline): `setBookmarkTags` with known IDs.
- User-facing API: `setBookmarkTagsByName` with names (upsert).

### 9.2 Metadata `transcript` Stripping
When returning bookmarks in search results, `transcript` is stripped from the `metadata` field to reduce response size (`cleanMetadata` in search-helpers.ts). The Convex list/get queries should strip the `transcript` key from metadata before returning. The processing pipeline stores transcript in metadata internally, but it must not be sent over the wire to clients.

### 9.3 `multipart/form-data` Bookmark Creation (Mobile)
When a mobile client sends `content-type: multipart/form-data` with an `image` file:
- Max size: `2 * 1024 * 1024` bytes (2MB).
- Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp, image/gif`.
- The image is uploaded to R2 at `users/${userId}/bookmarks/${Date.now()}-${fileName}`.
- The R2 URL becomes the bookmark `url`.
- `metadata.originalFileName` and `metadata.uploadedFromMobile = true` are set.

In Convex, this is an `httpAction` or a mutation that accepts a base64-encoded image. The R2 upload must happen in an action (requires `"use node"` for the AWS SDK). The create flow for image uploads is: upload to R2 (action) → then `create` mutation with the R2 URL.

### 9.4 Reprocess Flow
The update mutation allows `status: "PENDING"` as the only allowed `status` value in the patch. This triggers reprocessing. In Convex, the `update` mutation with `status: "PENDING"` must also call `assertCanRunProcessing` before scheduling.

### 9.5 `getNextPageParam` Migration
The frontend's `useBookmarks` hook uses the last bookmark's `id` as `getNextPageParam`. After migration to Convex `usePaginatedQuery` or `@convex-dev/react-query` paginated helper, the cursor format changes to Convex's opaque pagination cursor. The list component's `getNextPageParam` must be updated to use `lastPage.continueCursor` (Convex format).

### 9.6 Delete in `api.bookmarks.$bookmarkId.ts` does NOT cascade `bookmarkTags`
The current Prisma delete uses `prisma.bookmark.delete()` which cascades via `BookmarkTag.bookmarkId → onDelete: Cascade`. In Convex, there is no cascade — you must explicitly delete `bookmarkTags` rows (by `by_bookmark` index) and `bookmarkOpens` rows before deleting the bookmark. Failure to do so will leave orphaned join rows.

### 9.7 `SearchCache.invalidateBookmarkUpdate` becomes a no-op
The Redis-based search cache (`SearchCache.invalidateBookmarkUpdate`) is called after every create/update/delete. In Convex, there is no Redis cache to invalidate — Convex reactivity handles this automatically. All `SearchCache` calls are dropped.

### 9.8 `inngestRunId` Field
The Prisma `Bookmark` schema has an `inngestRunId` field that is not in the Convex schema. This field tracks the Inngest run for the processing pipeline. In Convex, this is replaced by `processingStep` (for reactive progress) and the `bookmarkProcessingRuns` table. Do not migrate `inngestRunId`.

### 9.9 `BookmarkChunk` Table
The Prisma schema has a `BookmarkChunk` table. Per Phase 04, this is deferred for v1. Do not create this table or logic in Phase 05.

### 9.10 `Tag.type` Default
In Prisma schema: `type TagType` default is `IA`. In the API code, user-created tags always use `type: "USER"`. AI-generated tags (from pipeline) use `type: "IA"`. The Convex mutation for user-facing tag creation must default to `"USER"`, not `"IA"`.

### 9.11 `Subscription.referenceId` vs `userId`
The Prisma `Subscription` model uses `referenceId` to link to the user (not `userId`). In Convex schema (Phase 04), this is normalized to `userId`. Limit checks must query `subscriptions` by `by_user` index (on `userId`).

### 9.12 v1 API `matchingDistance` Default Difference
The internal app API defaults `matchingDistance: 0.1`. The v1 API defaults `matchingDistance: 0.3`. Both must be preserved for parity.

### 9.13 Random Bookmark (`/api/v1/bookmarks/random`)
Uses `skip: Math.floor(Math.random() * totalAvailable)` — a random offset. Convex does not support `skip` natively. Workaround: paginate `by_user_status` index with status=READY (excluding bookmarks with opens via `by_bookmark_user` index), count total, then `.paginate` or use `.take(n).slice(random)`. Because Convex cannot do SQL-style `OFFSET`, this requires fetching all eligible IDs and picking randomly, or maintaining a separate mechanism. This endpoint is in Phase 12 (public API), but the `bookmarkOpens` recording logic must be in Phase 05's `recordOpen` mutation.

### 9.14 `GEMINI_EMBEDDING_CACHE_MODEL` Guard
The current vector search only matches bookmarks where `metadata->>'embeddingModel' = 'gemini-embedding-2:1536'`. In Convex, this becomes the `embeddingModel` top-level field (Phase 04 schema). The search action (Phase 07) must filter by `embeddingModel = "gemini-embedding-2:1536"` in the vector index query `filterFields`.

---

## 10. Frontend Hook Migration Map

| Current hook | Migration target |
|---|---|
| `useBookmarks` | `usePaginatedQuery(api.bookmarks.queries.list, filter)` or `useInfiniteQuery` + `convexQuery` |
| `useCreateBookmarkAction` | `useConvexMutation(api.bookmarks.mutations.create)` + `useMutation({ mutationFn: (args) => create(args) })` |
| `useBookmark(id)` | `useQuery(convexQuery(api.bookmarks.queries.get, { id }))` — reactive, replaces polling |
| `useBookmarkToken` + realtime subscribe | **DELETE** — Convex reactivity replaces Inngest realtime |
| `useBookmarkMetadata` | Keep as a Convex `httpAction` calling external URL or remove if not needed |
| `useRefreshBookmarks` | `useQueryClient().invalidateQueries` or just rely on Convex reactivity |
| `useRefreshBookmark` | Remove (Convex `useQuery` auto-refreshes) |
| `useTags(query?)` | `useQuery(convexQuery(api.tags.queries.list, { query }))` |
| `useInfiniteTags(query?)` | `usePaginatedQuery(api.tags.queries.list, { query })` |
| `useBookmarkTags(bookmarkId?)` | `useQuery(convexQuery(api.tags.queries.getByBookmark, { bookmarkId }))` + `useConvexMutation(api.tags.mutations.setBookmarkTagsByName)` |

**IMPORTANT:** `useConvexMutation` is a hook — must be called at component top level, never inside `useMutation`'s `mutationFn` argument. Pattern:
```ts
const create = useConvexMutation(api.bookmarks.mutations.create);
const { mutate } = useMutation({ mutationFn: (args) => create(args) });
```

---

## 11. Files to DELETE After Migration

```
apps/web/src/routes/api.bookmarks.ts
apps/web/src/routes/api.bookmarks.$bookmarkId.ts
apps/web/src/routes/api.bookmarks.$bookmarkId.tags.ts
apps/web/src/routes/api.bookmarks.$bookmarkId.metadata.ts
apps/web/src/routes/api.bookmarks.info.ts
apps/web/src/routes/api.tags.ts
apps/web/src/routes/api.tags.bulk-delete.ts
apps/web/src/routes/api.tags.cleanup.ts
apps/web/src/routes/api.tags.management.ts
apps/web/src/routes/api.tags.refactor.ts
apps/web/src/lib/database/create-bookmark.ts
apps/web/src/lib/database/bookmark-validation.ts
apps/web/src/lib/database/delete-bookmark.ts
apps/web/src/lib/database/get-bookmark.ts
apps/web/src/lib/search/search-cache.ts   (Redis cache — obsolete)
apps/web/src/lib/search/embedding-cache.ts
apps/web/src/lib/search/cached-search.ts
apps/web/src/lib/ai-tag-cleanup.ts        (moved to convex/tags/actions.ts)
```

---

## 12. Risks

1. **Counter atomicity**: `userCounters.bookmarkCount` must be incremented/decremented in the same Convex mutation as the bookmark insert/delete. If done in separate mutations, a crash between them will cause permanent drift.

2. **`setBookmarkTagsByName` upsert race**: Two concurrent mutations creating the same tag name for the same user could both pass the `by_user_name` check before either inserts. Convex mutations are serialized — this is not a problem as long as the check + insert happen in a single mutation.

3. **Tag management sort by count**: Convex does not support `ORDER BY count(related)`. The `listManagement` query must either (a) denormalize a `bookmarkCount` field on the `tags` table updated on each `bookmarkTags` insert/delete, or (b) fetch all user tags with a bounded `.take()` and sort in memory. Option (b) is acceptable for users with < 1000 tags.

4. **`refactorTags` transaction size**: A user with many tags and many bookmark associations could generate a large number of individual `db.insert` / `db.delete` calls within a single mutation, potentially hitting the Convex 1MB document write limit or per-mutation operation limit. Bound with `take(500)` per batch or implement as a multi-step action calling small mutations.

5. **Pagination cursor format change**: The existing frontend hooks use bookmark IDs or numeric offsets as cursors. After migration, Convex uses opaque cursor strings. All `getNextPageParam` calls must be updated.

6. **`useBookmarkToken` / Inngest realtime removal**: The detail page subscribes to `useBookmarkToken` and uses `@inngest/realtime` to stream processing updates. This MUST be removed (replaced by `useQuery(convexQuery(api.bookmarks.queries.get, { id }))` reactivity). If not removed, the component will fail with missing endpoints.

7. **`cleanMetadata` in list responses**: The current `bookmarkToSearchResult` strips `transcript` from metadata. The Convex `list` query must do the same. Failing to strip transcript from list responses bloats the payload significantly for YouTube/article bookmarks.
