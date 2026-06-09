# 00-CONTRACT.md — SaveIt Convex Backend Inter-Module Contract

> **This document is the single source of truth for all cross-module function references,
> DTO shapes, shared constants, and hard rules that every implementation engineer must follow.
> Do NOT diverge from this document. Where a spec disagrees with a plan skeleton, the spec wins.**
>
> Foundation files already built (do NOT redefine):
> - `convex/schema.ts` — all domain tables + validators
> - `convex/functions.ts` — `authQuery / authMutation / authAction / adminQuery / adminMutation / adminAction`
> - `convex/auth/config.ts` — `requireAuth / requireAdmin / authComponent / AuthedUser`
> - `convex/betterAuth/data.ts` — all betterAuth component data helpers
> - `convex/utils/errors.ts` — `throwUnauthorized / throwForbidden / throwNotFound / throwValidationError / throwLimitReached / throwConfigurationError`
> - Stubs to replace (keep same exported names/signatures): `email/actions.ts → sendAuthEmail`, `stripe/actions.ts → ensureCustomer + cancelAllForUser`, `marketing/newSubscriber.ts → start`, `auth/hooks.ts → onUserCreated`

---

## A. Module File Map

Each entry lists: **runtime** (default = Convex V8 edge; `"use node"` = Node.js), **exports** with kind + args + return shape, and a behavior note with spec reference.

---

### `billing/plans.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `PLANS` | const | — | `{ free: PlanLimits, pro: PlanLimits }` | Verbatim plan limits; never change without updating all limit checks. Spec 07 §2 |
| `AUTH_LIMIT_KEYS` | const | — | `readonly string[]` | `["bookmarks","monthlyBookmarkRuns","monthlyChatQueries","canExport","apiAccess"]`. Spec 07 §2 |
| `parseCustomLimits` | function | `(metadata: any) => Partial<PlanLimits>` | `Partial<PlanLimits>` | Extracts `metadata.customLimits`; validates each key is finite non-negative integer. Spec 07 §2 |
| `getLimits` | function | `(plan: "free"\|"pro", metadata?: any) => PlanLimits` | `PlanLimits` | Merges `PLANS[plan]` with `parseCustomLimits(metadata)`. Custom wins. Spec 07 §2 |

```ts
// Exact constants (MUST be verbatim):
export const PLANS = {
  free:  { bookmarks: 20,    monthlyBookmarkRuns: 20,   monthlyChatQueries: 10,  canExport: 0, apiAccess: 0 },
  pro:   { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 },
} as const;
export type PlanName = keyof typeof PLANS;
export type PlanLimits = (typeof PLANS)[PlanName];
```

---

### `billing/limits.ts` — default runtime

Internal helper module (no Convex function registrations, pure TypeScript helpers called from mutations/actions).

| Export | Signature | Behavior |
|--------|-----------|----------|
| `assertCanCreateBookmark` | `(ctx, userId: string) => Promise<void>` | Reads `userCounters` + `subscriptions`, computes limits, throws `throwLimitReached` with code `LIMIT_REACHED` if `bookmarkCount >= limits.bookmarks`. Also checks monthly runs. Spec 02 §5.2, Spec 07 §8.1 |
| `assertCanRunProcessing` | `(ctx, userId: string) => Promise<void>` | Counts `bookmarkProcessingRuns` since `startOfMonth()`, throws if `>= limits.monthlyBookmarkRuns`. Spec 02 §5.2 |
| `shouldSendLimitEmail` | `(ctx, userId: string) => Promise<boolean>` | Returns true if plan=free, no custom override, `bookmarkCount >= limits.bookmarks - 1`, and `!metadata.limitEmailSentAt`. Spec 02 §2.2, Spec 07 §8.1 |
| `startOfMonth` | `() => number` | `Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)` — UTC month boundary in ms. Spec 07 §16 note 5 |

---

### `bookmarks/queries.ts` — default runtime

| Export | Kind | Args Validators | Returns | Behavior |
|--------|------|-----------------|---------|----------|
| `list` | `authQuery` | `{ paginationOpts: paginationOptsValidator, filter?: { types?: v.array(bookmarkType), starred?: v.boolean(), read?: v.boolean(), tagIds?: v.array(v.id("tags")) } }` | `PaginationResult<BookmarkDTO>` | Paginates `by_user_created` desc; joins tags via `by_bookmark`. Strips `transcript` from metadata. Spec 02 §7 |
| `get` | `authQuery` | `{ id: v.id("bookmarks") }` | `BookmarkDetailDTO \| null` | Single bookmark + tags; asserts `userId` ownership; throws `throwNotFound` if missing or wrong user. Spec 02 §5.3 |
| `count` | `authQuery` | `{}` | `v.number()` | Reads `userCounters.bookmarkCount` (denormalized). Spec 02 §5.3 |
| `getByPublicSlug` | `query` (NOT authQuery) | `{ slug: v.string(), type?: bookmarkType, paginationOpts: paginationOptsValidator }` | `{ user: { name: string, image: string\|null }, bookmarks: PublicBookmarkDTO[], hasMore: boolean, nextCursor?: string }` | Unauthenticated. Checks `publicLinkEnabled === true`. Forces `starred:false, read:false`. Whitelist: `title,url,type,summary,preview,faviconUrl,createdAt,ogImageUrl,ogDescription`. Never returns `note,userId,vectorSummary,searchEmbedding`. Spec 02 §4.7, Spec 09 §3.6 |

Internal queries:

| Export | Kind | Args | Returns |
|--------|------|------|---------|
| `getById` | `internalQuery` | `{ id: v.id("bookmarks"), userId: v.string() }` | `BookmarkDetailDTO \| null` |
| `listByIds` | `internalQuery` | `{ ids: v.array(v.id("bookmarks")), userId: v.string() }` | `BookmarkDetailDTO[]` |
| `listDefault` | `internalQuery` | `{ userId: v.string(), paginationOpts: paginationOptsValidator, filter?: ... }` | `PaginationResult<BookmarkDTO>` |
| `listByType` | `internalQuery` | `{ userId: v.string(), types: v.array(bookmarkType), paginationOpts: paginationOptsValidator }` | `PaginationResult<BookmarkDTO>` |
| `getRandom` | `internalQuery` | `{ userId: v.string() }` | `{ bookmark: BookmarkDetailDTO, remaining: number } \| null` | Excludes opened bookmarks; picks random from READY set. Spec 09 §3.4 |

---

### `bookmarks/mutations.ts` — default runtime

| Export | Kind | Args Validators | Returns | Behavior |
|--------|------|-----------------|---------|----------|
| `create` | `authMutation` | `{ url: v.string(), note?: v.optional(v.string()), transcript?: v.optional(v.string()), metadata?: v.optional(v.any()) }` | `BookmarkDetailDTO` | `cleanUrl → assertCanCreateBookmark → dedupeCheck (by_user_url) → insert (status:PENDING) → bumpCounter → scheduleProcessing`. Error messages must contain `"already exists"` and `"maximum number of bookmarks"` verbatim. Spec 02 §2.2 |
| `update` | `authMutation` | `{ id: v.id("bookmarks"), patch: { starred?: v.boolean(), read?: v.boolean(), note?: v.optional(v.string()), status?: v.literal("PENDING") } }` | `BookmarkDetailDTO` | Ownership check → read-type guard (only ARTICLE/YOUTUBE) → `db.patch` → if `status=PENDING`: `assertCanRunProcessing` then `scheduleProcessing`. Spec 02 §5.4 |
| `remove` | `authMutation` | `{ id: v.id("bookmarks") }` | `v.object({ id: v.id("bookmarks") })` | Ownership check → delete `bookmarkTags` (by_bookmark) → delete `bookmarkOpens` → decrementCounter → schedule R2 cleanup → `db.delete`. Spec 02 §2.7 |
| `setStarred` | `authMutation` | `{ id: v.id("bookmarks"), starred: v.boolean() }` | `null` | Ownership check → `db.patch({ starred })`. |
| `setRead` | `authMutation` | `{ id: v.id("bookmarks"), read: v.boolean() }` | `null` | Ownership check → readable-type guard → `db.patch({ read })`. |
| `recordOpen` | `authMutation` | `{ id: v.id("bookmarks") }` | `null` | Ownership check → insert `bookmarkOpens` row. |
| `reprocess` | `authMutation` | `{ id: v.id("bookmarks") }` | `null` | Ownership check → `assertCanRunProcessing` → `db.patch({ status:"PENDING", processingStep:0 })` → scheduleProcessing. |
| `quickSave` | `authMutation` | `{ url: v.string() }` | `BookmarkDetailDTO` | Same as `create` without transcript/metadata. For `/api/b` bookmarklet. Spec 12 §2.7 |

Internal mutations:

| Export | Kind | Args | Behavior |
|--------|------|------|----------|
| `updatePreview` | `internalMutation` | `{ id: v.id("bookmarks"), userId: v.string(), preview: v.string() }` | Re-checks ownership, patches `preview`. Called after R2 upload. |
| `updateProcessing` | `internalMutation` | `{ id: v.id("bookmarks"), patch: v.any() }` | Pipeline progress patches. No auth check (internal). |
| `importBulk` | `authMutation` | `{ text: v.string() }` | Extracts URLs via regex, serial createBookmark up to `availableSlots`. Spec 12 §2.10 |
| `exportCsv` | `authMutation` | `{}` | `canExport` gate → dump CSV `title,description,summary,type,url`. Spec 12 §2.9 |

---

### `bookmarks/dto.ts` — default runtime (pure TS, no Convex registrations)

Defines TypeScript types and the `cleanMetadata` helper:

```ts
// Strips transcript from metadata before sending to client
export function cleanMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const { transcript: _, ...cleaned } = metadata;
  return cleaned;
}
```

---

### `tags/queries.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `list` | `authQuery` | `{ paginationOpts: paginationOptsValidator, query?: v.optional(v.string()) }` | `PaginationResult<TagDTO>` | `by_user` index, paginated; client-side text filter for query. Spec 02 §5.5 |
| `getByBookmark` | `authQuery` | `{ bookmarkId: v.id("bookmarks") }` | `TagDTO[]` | Asserts bookmark ownership first; `by_bookmark` index on bookmarkTags → join tag names. Spec 02 §5.5 |
| `listManagement` | `authQuery` | `{ paginationOpts: paginationOptsValidator, query?: v.optional(v.string()) }` | `PaginationResult<TagManagementDTO>` | Enriches each tag with `_count.bookmarks` (count via `by_tag` index). Post-sort by count desc. Spec 02 §5.5 |

---

### `tags/mutations.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `create` | `authMutation` | `{ name: v.string(), type?: v.optional(v.union(v.literal("USER"), v.literal("IA"))) }` | `TagDTO` | Check `by_user_name` for dupe → throw if exists → insert. Default type: `"USER"`. Spec 02 §2.9 |
| `setBookmarkTagsByName` | `authMutation` | `{ bookmarkId: v.id("bookmarks"), tagNames: v.array(v.string()) }` | `TagDTO[]` | Trim/dedup → fetch current → diff → upsert tags → manage join rows. Spec 02 §2.8 |
| `setBookmarkTags` | `authMutation` | `{ bookmarkId: v.id("bookmarks"), tagIds: v.array(v.id("tags")) }` | `TagDTO[]` | For pipeline use: takes known tag IDs. Spec 02 note §9.1 |
| `remove` | `authMutation` | `{ id: v.id("tags") }` | `null` | Ownership → delete `bookmarkTags` (by_tag) → delete tag. |
| `bulkDelete` | `authMutation` | `{ tagIds: v.array(v.id("tags")) }` | `v.object({ deletedTags: v.array(...), totalBookmarksAffected: v.number() })` | Verify all belong to user → delete joins → delete tags. Spec 02 §2.10 |
| `refactor` | `authMutation` | `{ refactors: v.array(v.object({ bestTag: v.string(), refactorTagIds: v.array(v.id("tags")), createBestTag: v.optional(v.boolean()) })) }` | Refactor result shape | Full merge logic. Spec 02 §2.11 |

---

### `tags/actions.ts` — `"use node"` (Gemini SDK)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `suggestCleanup` | `authAction` | `{}` | `{ suggestions: TagCleanupSuggestion[], totalTags: number }` | Fetch all user tags; if < 2 return []; call Gemini `generateObject` with verbatim prompts from Spec 03 §1.17. Spec 02 §5.7 |

---

### `processing/pipeline.ts` — `"use node"` (fetch, Gemini, R2)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `run` | `internalAction` | `{ bookmarkId: v.id("bookmarks"), userId: v.string() }` | `null` | Full orchestrator. Steps: limits check → fetch bookmark → set PROCESSING + create processingRun → dedupe check → route by type → call type handler → mark COMPLETE. On error: set ERROR status + FAILED processingRun. Spec 03 §2 |

Processing steps (called from `run`, not independently exported as Convex functions):
- Type routing logic in same file; delegates to handlers in `processing/steps.ts`.

---

### `processing/steps.ts` — `"use node"`

Contains the 7 type handler functions as regular async TypeScript functions (not Convex functions — they are called directly from `pipeline.ts`). Must be imported only from `pipeline.ts`.

| Handler function | Bookmark type | Key behavior |
|------------------|---------------|--------------|
| `processTweetBookmark` | `TWEET` | `getTweet(tweetId)` → analyze image → summaries → tags → R2 avatar → update. Spec 03 §7.1 |
| `processYouTubeBookmark` | `YOUTUBE` | oEmbed + transcript → thumbnail fallback → summaries → tags → R2 thumbnail → update. Spec 03 §7.2 |
| `processArticleBookmark` | `ARTICLE` | cheerio+turndown → metadata → screenshot → summaries → tags → R2 uploads → update. Spec 03 §7.3 |
| `processProductBookmark` | `PRODUCT` | 3-tier extraction → image analysis → display+search summaries → tags → update. Spec 03 §7.4 |
| `processImageBookmark` | `IMAGE` | sharp metadata → Gemini vision → title+summary → tags → R2 → update. Spec 03 §7.x |
| `processPdfBookmark` | `PDF` | R2 upload → Gemini multimodal → screenshot → summaries → tags → update. Spec 03 §7.x |
| `processPageBookmark` | `PAGE` | Same as article but without article detection. Default fallback. Spec 03 §7.x |

---

### `processing/embeddings.ts` — `"use node"` (AI SDK)

| Export | Kind | Signature | Behavior |
|--------|------|-----------|----------|
| `embedDocument` | function | `(text: string) => Promise<number[]>` | Single combined embedding using `taskType: "RETRIEVAL_DOCUMENT"`, `outputDimensionality: 1536`. Input: `title + "\n" + vectorSummary` (or just `title` when vectorSummary empty). |
| `embedQuery` | function | `(text: string) => Promise<number[]>` | Single query embedding using `taskType: "RETRIEVAL_QUERY"`, `outputDimensionality: 1536`. |

Constants:
```ts
export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536"; // stored in bookmark.embeddingModel
```

---

### `processing/gemini.ts` — `"use node"` (AI SDK)

| Export | Kind | Behavior |
|--------|------|----------|
| `GEMINI_MODEL_IDS` | const | `{ cheap: "gemini-3.1-flash-lite", normal: "gemini-3.1-pro-preview", embedding: "gemini-embedding-2" }` |
| `generateSummary` | function | `(systemPrompt: string, userInput: string, model?: string) => Promise<string>` — `generateText` wrapper |
| `generateStructured` | function | `(systemPrompt: string, userPrompt: string, schema: ZodSchema, model?: string) => Promise<T>` — `generateObject` wrapper |

---

### `processing/screenshot.ts` — `"use node"` (Node fetch)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `captureAndUploadScreenshot` | `internalAction` | `{ url: v.string(), userId: v.string(), bookmarkId: v.id("bookmarks") }` | `v.union(v.string(), v.null())` | Calls Cloudflare Browser Rendering API (POST, Bearer, 1920x1080, networkidle0, 30s) → uploads PNG to R2 at `users/{userId}/bookmarks/{bookmarkId}/screenshot.png`. Spec 04 §5.2 |
| `captureAndUploadPDFScreenshot` | `internalAction` | `{ url: v.string(), userId: v.string(), bookmarkId: v.id("bookmarks") }` | `v.union(v.string(), v.null())` | Appends `#toolbar=0&navpanes=0&scrollbar=0&view=FitH` to URL then delegates to screenshot capture. Key: `pdf-screenshot.png`. Spec 04 §5.2 |
| `analyzeScreenshot` | function (not Convex) | `(url: string) => Promise<{ description: string\|null, isInvalid: boolean, invalidReason: string\|null }>` | Calls Gemini vision with `IMAGE_ANALYSIS_PROMPT` + `invalid-image` tool. Spec 03 §6 |
| `isScreenshotUrlValid` | function (not Convex) | `(url: string) => Promise<boolean>` | HEAD request to verify URL is a valid image. |

---

### `processing/youtube.ts` — `"use node"`

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `fetchYouTubeMetadata` | `internalAction` | `{ videoId: v.string() }` | `v.object({ title: v.string(), thumbnail: v.string(), transcript: v.optional(v.string()) })` | oEmbed fetch + transcript from `@danielxceron/youtube-transcript`; swallows transcript errors. Spec 04 §5.3 |

---

### `processing/storage.ts` — `"use node"` (AWS SDK)

This file re-exports the R2 helpers. It does NOT register Convex functions; it exports plain async TypeScript functions called from within `"use node"` pipeline steps. Functions defined here are also callable from `files/actions.ts` Convex functions via import.

```ts
export async function uploadBuffer(opts: { buffer: Buffer; key: string; contentType: string }): Promise<string>
export async function uploadFromURL(opts: { url: string; key: string }): Promise<string | null>
export async function deleteObjects(keys: string[]): Promise<void>
```

---

### `processing/types/` — default runtime (pure type files, no Convex registrations)

Type-only files per bookmark type defining the exact metadata shape stored in `bookmark.metadata`:

| File | Type exported |
|------|---------------|
| `tweet.ts` | `TweetMetadata` |
| `youtube.ts` | `YoutubeMetadata` |
| `article.ts` | `ArticleMetadata` |
| `product.ts` | `ProductMetadata` |
| `image.ts` | `ImageMetadata` |
| `pdf.ts` | `PdfMetadata` |
| `page.ts` | `PageMetadata` |

---

### `files/actions.ts` — `"use node"` (AWS SDK)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `uploadBuffer` | `internalAction` | `{ buffer: v.bytes(), key: v.string(), contentType: v.string() }` | `v.string()` | `PutObjectCommand` to R2; returns `${R2_URL}/${key}`. Spec 04 §5.1 |
| `uploadFileFromURL` | `internalAction` | `{ url: v.string(), key: v.string(), contentType: v.optional(v.string()) }` | `v.union(v.string(), v.null())` | Fetches URL, detects MIME, uploads. CI bypass: return placeholder if `process.env.CI`. Spec 04 §5.1 |
| `deleteObjects` | `internalAction` | `{ keys: v.array(v.string()) }` | `v.null()` | `DeleteObjectCommand` per key. Spec 04 §5.1 |
| `uploadBookmarkScreenshot` | `authAction` | `{ bookmarkId: v.id("bookmarks"), fileData: v.bytes(), fileName: v.string(), contentType: v.string(), fileSize: v.number() }` | `v.object({ success: v.boolean(), previewUrl: v.string() })` | 1. Ownership check via `getById`. 2. Size ≤ 2MB. 3. MIME in allowlist. 4. Upload to `users/{userId}/bookmarks/{bookmarkId}/{Date.now()}-{fileName}`. 5. Call `updatePreview` mutation. Spec 04 §4, Spec 09 §4.3 |

---

### `search/actions.ts` — `"use node"` (Gemini AI SDK)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `search` | `authAction` | `{ query?: v.optional(v.string()), tags?: v.optional(v.array(v.string())), types?: v.optional(v.array(bookmarkType)), specialFilters?: v.optional(v.array(...)), limit?: v.optional(v.number()), cursor?: v.optional(v.string()), matchingDistance?: v.optional(v.number()) }` | `SearchResponse` | Full routing: no-query→list, type-only→listByType, domain→searchByDomain, tag-only→searchByTags, else→vector. Spec 05 §2, §15 |
| `searchForChat` | `authAction` | Same as `search` minus pagination cursor | `SearchResponse` (limit default 6, matchingDistance default 0.8) | For AI chat tools. Spec 05 §15 |

Vector search flow in `search`:
1. `embedQuery(query)` → `number[]`
2. `ctx.vectorSearch("bookmarks", "by_search_embedding", { vector, limit: 50, filter: q => q.eq("userId", userId) })`
3. Post-filter `embeddingModel === "gemini-embedding-2:1536"`
4. Apply matchingDistance spread: keep `_score >= maxScore - matchingDistance`
5. Three-level fallback: spread → 1.0 spread → no spread
6. `base_score = 100 * _score * 0.6` + `applyOpenFrequencyBoost(baseScore, openCount)`

---

### `search/helpers.ts` — default runtime (pure TS, no Convex registrations)

```ts
export function isDomainQuery(query: string): boolean
export function extractDomain(query: string): string
export function isSearchQuery(query?: string): boolean
export function applyOpenFrequencyBoost(score: number, openCount: number): number
  // score + Math.log(openCount + 1) * 10
export function sortSearchResults(results: SearchResultDTO[]): SearchResultDTO[]
export function paginateResults(results: SearchResultDTO[], cursor?: string, limit?: number): { bookmarks: SearchResultDTO[], nextCursor?: string, hasMore: boolean }
export function cleanMetadata(metadata: any): any  // strips transcript field
export function bookmarkToSearchResult(bookmark: any, score: number, matchType: string, matchedTags?: string[], openCount?: number): SearchResultDTO
```

Internal queries (in `search/queries.ts`):

| Export | Kind | Args | Returns |
|--------|------|------|---------|
| `searchByDomain` | `internalQuery` | `{ userId: v.string(), domain: v.string(), types?: ..., specialFilters?: ... }` | `SearchResultDTO[]` |
| `searchByTags` | `internalQuery` | `{ userId: v.string(), tags: v.array(v.string()), types?: ..., specialFilters?: ... }` | `SearchResultDTO[]` |
| `loadForSearch` | `internalQuery` | `{ ids: v.array(v.id("bookmarks")), userId: v.string() }` | `BookmarkDetailDTO[]` with ownership re-check |

---

### `stripe/actions.ts` — `"use node"` (Stripe SDK) — REPLACES STUB

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `ensureCustomer` | `internalAction` | `{ userId: v.string() }` | `null` | Idempotent: check if `stripeCustomerId` already set. Create Stripe customer `{email, name, metadata:{userId}}`. Patch user via `patchUser`. Spec 07 §6 |
| `cancelAllForUser` | `internalAction` | `{ userId: v.string() }` | `null` | Look up `stripeCustomerId` from user row (NOT user.id — spec 07 §7). List + cancel subscriptions. Swallow errors. Spec 07 §7 |
| `createCheckout` | `authAction` | `{ plan: v.string(), annual: v.boolean(), successUrl: v.string(), cancelUrl: v.string() }` | `v.object({ url: v.string() })` | Derive priceId from `PLANS`. Must have `stripeCustomerId`; call `ensureCustomer` if absent. Create session with `allow_promotion_codes:true, metadata:{userId,plan}`. Spec 07 §4.2 |
| `createBillingPortal` | `authAction` | `{}` | `v.object({ url: v.string() })` | Create portal session with `return_url: SITE_URL + "/app"`. Spec 07 §4.3 |
| `processWebhook` | `internalAction` | `{ body: v.string(), signature: v.string() }` | `v.object({ ok: v.boolean(), error: v.optional(v.string()) })` | Verify signature → dispatch to handlers → call `upsertFromWebhook`/`updateFromWebhook`. On first pro activation: schedule subscription drip. On upgrade-from-free: reset ERROR bookmarks with "Limit exceeded" error. Spec 07 §5 |
| `createPromotionCode` | `internalAction` | `{ userId: v.string(), stripeCustomerId: v.optional(v.string()) }` | `v.object({ code: v.string() })` | Creates Stripe promo code: `coupon:STRIPE_COUPON_ID, code:nanoid(6).toUpperCase(), max_redemptions:1, expires_at:+3days unix, restrictions:{first_time_transaction:true}`. Spec 07 §4.6 |

---

### `subscriptions/queries.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `getMine` | `authQuery` | `{}` | `SubscriptionDTO \| null` | `by_user` index. Spec 07 §11 |
| `getUserPlan` | `authQuery` | `{}` | `UserLimits` | Subscription + user metadata → merged limits. Spec 07 §11 |

---

### `subscriptions/mutations.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `upsertFromWebhook` | `internalMutation` | `{ userId: v.string(), stripeCustomerId: v.optional(v.string()), stripeSubscriptionId: v.optional(v.string()), plan: v.string(), status: v.string(), periodStart: v.number(), periodEnd: v.number(), cancelAtPeriodEnd: v.boolean() }` | `null` | Find by `by_user`; update or insert. Idempotent. Spec 07 §11 |
| `updateFromWebhook` | `internalMutation` | `{ stripeSubscriptionId: v.string(), plan: v.string(), status: v.string(), periodStart: v.number(), periodEnd: v.number(), cancelAtPeriodEnd: v.boolean() }` | `null` | Find by `by_stripe_subscription`; update. Spec 07 §11 |

---

### `email/mutations.ts` — default runtime (uses `@convex-dev/resend` component)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `sendEmail` | `internalMutation` | `{ to: v.string(), subject: v.string(), html: v.string(), from?: v.optional(v.string()), replyTo?: v.optional(v.string()) }` | `null` | Calls `resend.sendEmail(ctx, ...)`. `from` defaults to `RESEND_EMAIL_FROM` env. Playwright test guard: if `to.startsWith("playwright-test-")` skip. Spec 08 §3.1 |

---

### `email/actions.ts` — `"use node"` (React Email JSX) — REPLACES STUB

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `sendAuthEmail` | `internalAction` | `{ to: v.string(), subject: v.string(), title: v.string(), description: v.string(), actionLabel?: v.optional(v.string()), actionUrl?: v.optional(v.string()), preview?: v.optional(v.string()), otp?: v.optional(v.string()) }` | `null` | Renders `MarkdownEmail`; calls `sendEmail` mutation. **Replaces stub**. In dev: prepend `[DEV]` to subject. Spec 08 §3.2 |
| `sendMarkdownEmail` | `internalAction` | `{ to: v.string(), subject: v.string(), markdown: v.string(), preview?: v.optional(v.string()), from?: v.optional(v.string()), disabledSignature?: v.optional(v.boolean()) }` | `null` | Renders `MarkdownEmail`; calls `sendEmail` mutation. Spec 08 §3.2 |
| `sendMarketingEmail` | `internalAction` | `{ userId: v.string(), to: v.string(), subject: v.string(), text: v.string(), preview?: v.optional(v.string()) }` | `null` | Check `user.unsubscribed → return early (no throw)`. Append HMAC-signed unsubscribe link to text. Call `sendMarkdownEmail`. Spec 08 §3.2, §5.3 |

---

### `email/templates.tsx` — `"use node"` (React, JSX)

React Email component files (not Convex functions):
- `EmailLayout` component (logo, footer with "Melvyn, from SaveIt.now", "Bali, Indonesia")
- `MarkdownEmail` component (`markdown: string, preview?: string, disabledSignature?: boolean` — appends `\n\nBest,\n\nMelvyn from SaveIt.now` unless `disabledSignature:true`)

---

### `marketing/newSubscriber.ts` — default runtime — REPLACES STUB

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `start` | `internalMutation` | `{ userId: v.string() }` | `null` | Checks `metadata.newSubscriberDripStartedAt` (idempotency). Sets flag. Schedules `internal.marketing.drips.startNewSubscriberDrip` via `ctx.scheduler.runAfter(0, ...)`. **Replaces stub**. Spec 08 §3.4 |

---

### `marketing/subscription.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `startSubscriptionDrip` | `internalAction` | `{ userId: v.string() }` | `null` | Sends `SUBSCRIPTION_THANK_YOU_EMAIL`; schedules step2 after 24h. Spec 08 §3.4 |

(Step2-4 functions similarly named, all `internalAction`)

---

### `marketing/limitReached.ts` — default runtime (`"use node"` for stripe promo code step)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `startLimitReachedDrip` | `internalAction` | `{ userId: v.string() }` | `null` | Guard: `metadata.limitEmailSentAt` set → return. Create promo code via Stripe. Send `LIMIT_REACHED_DISCOUNT_EMAIL`. Set `limitEmailSentAt`. Schedule step2 after 24h with `promoCode`. Spec 08 §3.4 |

---

### `marketing/maintenance.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `sendBatchEmail` | `internalAction` | `{ subject: v.string(), subheadline: v.string(), markdown: v.string() }` | `null` | Paginate eligible users (unsubscribed:false) in batches of 100. Parallel sends per batch. 1s delay between batches. Admin-triggered only. Spec 08 §3.5 |

---

### `marketing/drips.ts` — default runtime (umbrella for all drip step functions)

All exports are `internalAction`. Drip step functions for new-subscriber chain (step1-step7) and subscription chain (step2-step4) and limit-reached chain (step2-step3). See Spec 08 §3.4 for exact email content and delays.

---

### `crons.ts` — default runtime

| Cron | Schedule | Behavior |
|------|----------|----------|
| `monthlyCounterReset` | `"0 0 1 * *"` (1st of month midnight UTC) | Resets `userCounters.monthlyRuns` and `monthlyChatQueries` where `monthKey !== currentMonthKey`. |
| `staleProcessingReset` | `"0 * * * *"` (every hour) | Resets bookmarks stuck in `PROCESSING` status for > 30 minutes back to `PENDING`. |

---

### `chat/stream.ts` — `"use node"` (AI SDK + streaming)

| Export | Kind | Behavior |
|--------|------|----------|
| `chatStreamHandler` | `httpAction` (registered in http.ts at `POST /chat`) | Auth via `ctx.auth.getUserIdentity()` with try/catch (not returns null — it throws). Check+increment usage via `checkAndIncrementUsage` mutation. `streamText` with Gemini `gemini-3.1-pro-preview`, `stopWhen:stepCountIs(20)`. Tools call internal Convex functions. `onFinish`: persist messages via `addMessages` mutation. Return `toUIMessageStreamResponse`. Spec 06 §5.1, §10.1 |

---

### `chat/queries.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `listConversations` | `authQuery` | `{}` | `Array<ConversationDTO>` | `by_user_updated` index, desc, take(50). Spec 06 §5.3 |
| `getConversation` | `authQuery` | `{ conversationId: v.id("chatConversations") }` | `ConversationWithMessagesDTO \| null` | Ownership check. Load `chatMessages` via `by_conversation`, order asc. Spec 06 §5.3 |
| `getChatUsage` | `authQuery` | `{}` | `{ used: number, limit: number, remaining: number, plan: string }` | Count `chatUsages` since `startOfMonth()`. Spec 06 §5.3 |

Internal queries:

| Export | Kind | Args | Returns |
|--------|------|------|---------|
| `getConversationsWithLikes` | `internalQuery` | `{}` | Admin query: all conversations where `likes != 0`, ordered by likes desc. Spec 06 §9 |
| `getConversationAdmin` | `internalQuery` | `{ conversationId: v.id("chatConversations") }` | Full conversation + messages (no ownership check). Spec 06 §9 |

---

### `chat/mutations.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `checkAndIncrementUsage` | `internalMutation` | `{ userId: v.string() }` | `null` | ATOMIC: count chatUsages for month → check limit → insert row. Must be single mutation. Spec 06 §2.6 |
| `addMessages` | `internalMutation` | `{ conversationId: v.id("chatConversations"), userId: v.string(), messages: v.array(v.any()) }` | `null` | Verify ownership → insert each message → patch conversation updatedAt. Spec 06 §5.2 |
| `insertConversation` | `internalMutation` | `{ userId: v.string(), title: v.string() }` | `v.id("chatConversations")` | Insert into chatConversations. Called from action. |
| `renameConversation` | `authMutation` | `{ conversationId: v.id("chatConversations"), title: v.string() }` | `null` | Ownership check → patch title + updatedAt. Spec 06 §5.2 |
| `likeConversation` | `authMutation` | `{ conversationId: v.id("chatConversations") }` | `null` | Ownership → `likes + 1`. Spec 06 §5.2 |
| `dislikeConversation` | `authMutation` | `{ conversationId: v.id("chatConversations") }` | `null` | Ownership → `likes - 1` (can go negative). Spec 06 §5.2 |
| `deleteConversation` | `authMutation` | `{ conversationId: v.id("chatConversations") }` | `null` | Ownership → delete all `chatMessages` (by_conversation) → delete conversation. Spec 06 §5.2 |

---

### `chat/actions.ts` — `"use node"` (Gemini SDK)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `createConversationWithTitle` | `authAction` | `{ firstMessage: v.string() }` | `v.object({ id: v.string(), title: v.string() })` | `generateText` with title prompt → call `insertConversation` mutation → return. Spec 06 §5.4 |

---

### `chat/usage.ts` — default runtime

Helper functions (not Convex registrations) used by `chat/mutations.ts`:
```ts
export function startOfMonth(): number  // Date.UTC(year, month, 1)
```

---

### `apiKeys/actions.ts` — default runtime (or `"use node"` if BA adapter requires Node)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `validateApiKey` | `internalAction` | `{ token: v.string() }` | `v.union(v.object({ user: v.object({ id: v.string() }), apiKey: v.object({ id: v.string(), name: v.string() }) }), v.null())` | `authComponent.verifyApiKey` → fetch user → compute limits → `apiAccess === 0 → throwForbidden("Pro plan required")`. Spec 09 §2 |
| `renameKey` | `authMutation` | `{ keyId: v.string(), name: v.string() }` | `null` | Ownership check (keyId must belong to user) → patch name. Schema: `name: v.string()` max 255 chars. Spec 01 §10 |

---

### `users/mutations.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `setOnboarding` | `authMutation` | `{}` | `null` | Patches user `onboarding: true` via `patchUser`. Spec 12 §2.8 |
| `updatePublicLink` | `authMutation` | `{ enabled: v.boolean(), slug: v.optional(v.union(v.string(), v.null())) }` | `null` | Validates slug regex `/^[a-z0-9-]+$/`, min 3 max 50. Uniqueness check. If `enabled && !slug` → throw. Spec 12 §2.4 |

---

### `users/actions.ts` — `"use node"` (R2 SDK + Resend)

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `uploadAvatar` | `authAction` | `{ fileData: v.bytes(), fileName: v.string(), contentType: v.string(), fileSize: v.number() }` | `v.object({ success: v.boolean(), avatarUrl: v.string() })` | Size ≤ 2MB. MIME in allowlist. Upload to `users/{userId}/avatar/{Date.now()}-avatar.{ext}`. Patch user `image`. Spec 12 §2.2 |
| `sendBugReport` | `authAction` | `{ description: v.string(), deviceInfo?: v.optional(v.string()), appVersion?: v.optional(v.string()) }` | `null` | `description` min 10 chars. Sends HTML email to `HELP_EMAIL`. Spec 12 §2.5 |

---

### `users/queries.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `getLimits` | `authQuery` | `{}` | `UserLimits` | Returns `{ plan, limits, customLimits, subscription }`. Spec 12 §2.3 |

---

### `changelog/mutations.ts` — default runtime

| Export | Kind | Args | Returns |
|--------|------|------|---------|
| `dismiss` | `authMutation` | `{ version: v.string() }` | `null` |

### `changelog/queries.ts` — default runtime

| Export | Kind | Args | Returns |
|--------|------|------|---------|
| `checkDismissed` | `authQuery` | `{ version: v.string() }` | `v.object({ isDismissed: v.boolean() })` |

Note: Requires `changelogDismissals` table in schema: `defineTable({ userId: v.string(), version: v.string() }).index("by_user_version", ["userId", "version"])`.

---

### `auth/hooks.ts` — default runtime — REPLACES STUB

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `onUserCreated` | `internalMutation` | `{ userId: v.string() }` | `null` | 1. Schedule `ensureCustomer` action. 2. Schedule `insertWelcomeBookmark` action. 3. Schedule `marketing.newSubscriber.start` mutation. All with `ctx.scheduler.runAfter(0, ...)`. Each wrapped in try/catch. **Replaces stub**. Spec 01 §7.1 |

---

### `auth/mutations.ts` — default runtime

| Export | Kind | Args | Returns | Behavior |
|--------|------|------|---------|----------|
| `updateProfile` | `authMutation` | `{ name?: v.optional(v.string()), email?: v.optional(v.string()) }` | `null` | `name` → `authComponent.updateUser`. `email` → `authComponent.changeEmail`. Spec 01 §16, Spec 12 §2.1 |
| `unsubscribe` | `httpAction` (registered in http.ts) | Request with `userId` + `token` params | `Response` | Verify HMAC-SHA256 token. Set `unsubscribed: true` via `patchUser`. Spec 08 §2.6, §5.3 |

---

### `tools/actions.ts` — `"use node"` (cheerio, turndown, fetch)

All registered as httpActions via `http.ts`:

| Export | HTTP route | Behavior |
|--------|-----------|----------|
| `extractContent` | `POST /api/tools/extract-content` | Spec 12 §2.13 |
| `extractMetadata` | `POST /api/tools/extract-metadata` | Spec 12 §2.14 |
| `extractFavicons` | `POST /api/tools/extract-favicons` | Spec 12 §2.15 |
| `extractOgImages` | `POST /api/tools/og-images` | Spec 12 §2.16 |
| `youtubeMetadata` | `POST /api/tools/youtube-metadata` | Spec 12 §2.17 |

All require Zod input validation before processing.

---

## B. Canonical Function-Reference Table

This is the exact reference string all callers must use. No aliases, no guessing.

| Logical operation | Exact reference | Called from |
|-------------------|-----------------|-------------|
| Run bookmark processing pipeline | `internal.processing.pipeline.run` | `bookmarks.mutations.create`, `bookmarks.mutations.update` (status:PENDING), `bookmarks.mutations.reprocess` |
| Capture web screenshot | `internal.processing.screenshot.captureAndUploadScreenshot` | `processing/steps.ts` (processArticle/Page/Product handlers) |
| Capture PDF screenshot | `internal.processing.screenshot.captureAndUploadPDFScreenshot` | `processing/steps.ts` (processPdf handler) |
| Fetch YouTube metadata | `internal.processing.youtube.fetchYouTubeMetadata` | `processing/steps.ts` (processYoutube handler) |
| Upload buffer to R2 | `internal.files.actions.uploadBuffer` | `processing/screenshot.ts`, pipeline steps |
| Upload URL to R2 | `internal.files.actions.uploadFileFromURL` | pipeline steps (OG image, favicons) |
| Delete R2 objects | `internal.files.actions.deleteObjects` | `bookmarks.mutations.remove` (scheduled) |
| Upload bookmark screenshot (user) | `api.files.actions.uploadBookmarkScreenshot` | Extension, web UI |
| List bookmarks | `api.bookmarks.queries.list` | Frontend |
| Get single bookmark | `api.bookmarks.queries.get` | Frontend, chat tools |
| Get bookmark by ID (internal) | `internal.bookmarks.queries.getById` | `chat/stream.ts` tools, `files/actions.ts` |
| Get bookmarks by IDs (internal) | `internal.bookmarks.queries.listByIds` | `chat/stream.ts` tools |
| Create bookmark | `api.bookmarks.mutations.create` | Frontend, extension, http.ts `/api/bookmarks` |
| Update bookmark | `api.bookmarks.mutations.update` | Frontend |
| Delete bookmark | `api.bookmarks.mutations.remove` | Frontend, `api.v1.bookmarks.delete` httpAction |
| Update bookmark preview (internal) | `internal.bookmarks.mutations.updatePreview` | `files/actions.ts` |
| Update processing state (internal) | `internal.bookmarks.mutations.updateProcessing` | `processing/pipeline.ts` |
| Bulk import bookmarks | `api.bookmarks.mutations.importBulk` | http.ts `/api/imports` |
| Export bookmarks CSV | `api.bookmarks.mutations.exportCsv` | http.ts `/api/exports` |
| Count bookmarks | `api.bookmarks.queries.count` | Frontend counter display |
| Get public slug bookmarks | `api.bookmarks.queries.getByPublicSlug` | http.ts `/api/v1/public/:slug/bookmarks` |
| Get random bookmark (internal) | `internal.bookmarks.queries.getRandom` | http.ts `/api/v1/bookmarks/random` |
| List tags | `api.tags.queries.list` | Frontend |
| Get tags for bookmark | `api.tags.queries.getByBookmark` | Frontend |
| List tags for management | `api.tags.queries.listManagement` | Frontend management view |
| Set bookmark tags by name | `api.tags.mutations.setBookmarkTagsByName` | Frontend, chat `updateTags` tool |
| Set bookmark tags by ID (internal) | `api.tags.mutations.setBookmarkTags` | `processing/pipeline.ts` (AI-generated tags) |
| Bulk delete tags | `api.tags.mutations.bulkDelete` | Frontend |
| Refactor (merge) tags | `api.tags.mutations.refactor` | Frontend |
| Suggest tag cleanup | `api.tags.actions.suggestCleanup` | Frontend |
| Search bookmarks (user-facing) | `api.search.actions.search` | Frontend `useBookmarks` |
| Search for chat tools | `internal.search.actions.searchForChat` | `chat/stream.ts` `searchBookmarks` tool |
| Get user plan/limits | `api.subscriptions.queries.getUserPlan` | Frontend, `billing/limits.ts` |
| Get my subscription | `api.subscriptions.queries.getMine` | Frontend |
| Upsert subscription from webhook | `internal.subscriptions.mutations.upsertFromWebhook` | `stripe/actions.ts processWebhook` |
| Update subscription from webhook | `internal.subscriptions.mutations.updateFromWebhook` | `stripe/actions.ts processWebhook` |
| Create Stripe checkout | `api.stripe.actions.createCheckout` | Frontend |
| Create billing portal | `api.stripe.actions.createBillingPortal` | Frontend |
| Ensure Stripe customer | `internal.stripe.actions.ensureCustomer` | `auth/hooks.ts onUserCreated` |
| Cancel all Stripe subscriptions | `internal.stripe.actions.cancelAllForUser` | `auth/config.ts beforeDelete` |
| Create promo code | `internal.stripe.actions.createPromotionCode` | `marketing/limitReached.ts` |
| Process Stripe webhook | `internal.stripe.actions.processWebhook` | `http.ts /stripe/webhook` |
| Send auth email | `internal.email.actions.sendAuthEmail` | `auth/config.ts scheduleEmail` |
| Send markdown email (internal) | `internal.email.actions.sendMarkdownEmail` | marketing drips |
| Send marketing email (guarded) | `internal.email.actions.sendMarketingEmail` | All drip step functions |
| Send email mutation (leaf) | `internal.email.mutations.sendEmail` | `email/actions.ts` |
| Start new-subscriber drip | `internal.marketing.newSubscriber.start` | `auth/hooks.ts onUserCreated` |
| Start subscription drip | `internal.marketing.subscription.startSubscriptionDrip` | `stripe/actions.ts processWebhook` |
| Start limit-reached drip | `internal.marketing.limitReached.startLimitReachedDrip` | `bookmarks.mutations.create` (via `shouldSendLimitEmail`) |
| Batch marketing email | `internal.marketing.maintenance.sendBatchEmail` | Admin action mutation |
| Check + increment chat usage | `internal.chat.mutations.checkAndIncrementUsage` | `chat/stream.ts chatStreamHandler` |
| Add messages to conversation | `internal.chat.mutations.addMessages` | `chat/stream.ts onFinish` |
| List conversations | `api.chat.queries.listConversations` | Frontend |
| Get conversation | `api.chat.queries.getConversation` | Frontend |
| Get chat usage | `api.chat.queries.getChatUsage` | Frontend |
| Create conversation with title | `api.chat.actions.createConversationWithTitle` | Frontend |
| Validate API key | `internal.apiKeys.actions.validateApiKey` | `apiKeyAction` builder in `functions.ts`, http.ts |
| On user created | `internal.auth.hooks.onUserCreated` | `auth/config.ts databaseHooks.user.create.after` |
| Patch betterAuth user | `components.betterAuth.data.patchUser` | `stripe/actions.ts`, `users/mutations.ts`, `marketing/limitReached.ts` |
| Get betterAuth user by ID | `components.betterAuth.data.getUserById` | Anywhere user metadata needed |
| Dismiss changelog | `api.changelog.mutations.dismiss` | Frontend |
| Check changelog dismissed | `api.changelog.queries.checkDismissed` | Frontend |
| Set onboarding | `api.users.mutations.setOnboarding` | http.ts `/api/start` |
| Update public link | `api.users.mutations.updatePublicLink` | http.ts `/api/user/public-link` |
| Upload avatar | `api.users.actions.uploadAvatar` | http.ts `/api/user/avatar` |
| Get user limits | `api.users.queries.getLimits` | http.ts `/api/user/limits` |
| Send bug report | `api.users.actions.sendBugReport` | http.ts `/api/bug-report` |
| Update profile | `api.auth.mutations.updateProfile` | http.ts `/api/user/profile` |

---

## C. DTO Shapes (Frozen — External + Frontend Depend on These)

### `BookmarkDTO` (list item)

```ts
type BookmarkDTO = {
  _id: Id<"bookmarks">;        // Convex ID (string)
  id: string;                   // alias for _id for API compat
  url: string;
  title: string | null;
  summary: string | null;
  preview: string | null;       // R2 CDN URL
  type: BookmarkType | null;
  status: BookmarkStatus;
  ogImageUrl: string | null;
  ogDescription: string | null;
  faviconUrl: string | null;
  score: number;                // 0 for browsing, computed for search
  matchType: "tag" | "vector" | "combined" | "default";
  matchedTags: string[];
  tags: Array<{ tag: { id: string; name: string; type: string } }>;
  createdAt: number;            // ms timestamp
  metadata: Record<string, unknown> | null;  // transcript STRIPPED
  openCount: number;
  starred: boolean;
  read: boolean;
}
```

### `BookmarkDetailDTO` (single bookmark, full)

All fields from `BookmarkDTO` plus:
```ts
{
  note: string | null;
  userId: string;
  vectorSummary: string | null;  // NOT sent to public endpoints
  updatedAt: number;
  processingStep: number | null;
  processingError: string | null;
}
```

### `TagDTO`

```ts
type TagDTO = {
  _id: Id<"tags">;
  id: string;      // alias
  name: string;
  type: "USER" | "IA";
}
```

### `TagManagementDTO`

```ts
type TagManagementDTO = TagDTO & {
  _count: { bookmarks: number };
}
```

### `SearchResultDTO`

```ts
type SearchResultDTO = BookmarkDTO;  // same shape, score is always set
// score range: vector 0-60+boost, tag 0-150+boost, domain 120-150+boost
// matchType distinguishes source strategy
```

### `SubscriptionDTO`

```ts
type SubscriptionDTO = {
  _id: Id<"subscriptions">;
  id: string;
  userId: string;
  plan: "free" | "pro";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string | null;           // "active" | "trialing" | "canceled" | ...
  periodStart: number | null;       // ms
  periodEnd: number | null;         // ms
  cancelAtPeriodEnd: boolean | null;
  createdAt: number;
  updatedAt: number;
}
```

### `UserLimits`

```ts
type UserLimits = {
  plan: "free" | "pro";
  limits: {
    bookmarks: number;
    monthlyBookmarkRuns: number;
    monthlyChatQueries: number;
    canExport: number;    // 0 or 1
    apiAccess: number;    // 0 or 1
  };
  customLimits: Partial<{
    bookmarks: number;
    monthlyBookmarkRuns: number;
    monthlyChatQueries: number;
    canExport: number;
    apiAccess: number;
  }>;
  subscription: {
    id: string;
    status: string;
    periodEnd: number | null;  // ms
  } | null;
}
```

### `PublicBookmarkDTO` — WHITELIST ONLY

```ts
// Fields that may appear in public API responses (/api/v1/public/:slug/bookmarks)
type PublicBookmarkDTO = {
  id: string;
  url: string;
  title: string | null;
  type: BookmarkType | null;
  summary: string | null;
  preview: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  ogDescription: string | null;
  createdAt: number;
  status: BookmarkStatus;
  starred: false;          // ALWAYS false — never expose real value
  read: false;             // ALWAYS false — never expose real value
  matchedTags: string[];
  metadata: Record<string, unknown> | null;  // transcript stripped
}
// NEVER include: note, userId, vectorSummary, searchEmbedding, processingError, embeddingModel
```

### `/api/v1` JSON Request/Response Shapes

**`GET /api/v1/bookmarks`**
- Request query params: `query?`, `tags? (csv)`, `types? (csv)`, `special? (READ|UNREAD|STAR)`, `limit? (1-100, default 20)`, `cursor?`, `matchingDistance? (0.1-2.0, default 0.3)`
- Response: `{ success: true, bookmarks: BookmarkDTO[], hasMore: boolean, nextCursor: string | null }`

**`POST /api/v1/bookmarks`**
- Request: `{ url: string, transcript?: string, metadata?: object }` or multipart with optional `image` field (≤2MB, MIME allowlist)
- Response: `{ success: true, bookmark: { id, url, title, summary, type, status, starred, read, createdAt, updatedAt } }`

**`DELETE /api/v1/bookmarks/:bookmarkId`**
- Response: `{ success: true, bookmark: { id: string } }`

**`GET /api/v1/bookmarks/random`**
- Response (200): `{ success: true, bookmark: { id, url, title, summary, type, status, starred, read, preview, faviconUrl, ogImageUrl, ogDescription, createdAt, tags: string[] }, remaining: number }`
- Response (404): `{ success: false, error: "No more bookmarks available. All bookmarks have been opened.", totalOpened: number }`

**`GET /api/v1/tags`**
- Request query params: `limit? (1-100, default 20)`, `cursor?`
- Response: `{ success: true, tags: Array<{ id, name, type, bookmarkCount }>, hasMore: boolean, nextCursor: string | null }`

**`GET /api/v1/public/:slug/bookmarks`**
- Request query params: `query?`, `tags?`, `types?`, `limit? (1-100, default 20)`, `cursor?`
- Response: `{ success: true, user: { name, image }, bookmarks: PublicBookmarkDTO[], hasMore: boolean, nextCursor: string | null }`

**Error response shape (all /api/v1/* and /api/* httpActions):**
```json
{ "error": "string message", "success": false }
```
SDK reads: `body.error` (string) or `body.error.message` (if object). This shape MUST be preserved.

---

## D. Shared Constants

### Plan Limits (verbatim — do not edit)

```ts
PLANS.free  = { bookmarks: 20,    monthlyBookmarkRuns: 20,   monthlyChatQueries: 10,  canExport: 0, apiAccess: 0 }
PLANS.pro   = { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 }
```

`canExport` and `apiAccess` are numeric flags: `=== 0` means denied, `!== 0` means allowed.

### Embedding Constants

```ts
EMBEDDING_MODEL = "gemini-embedding-2"          // model name for @ai-sdk/google
EMBEDDING_DIMENSIONS = 1536
EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536" // stored in bookmark.embeddingModel
DOCUMENT_TASK_TYPE = "RETRIEVAL_DOCUMENT"       // for indexing (pipeline)
QUERY_TASK_TYPE = "RETRIEVAL_QUERY"             // for search (search action)
// Combined document text: title + "\n" + vectorSummary
// When vectorSummary empty: embed title alone
```

### Gemini Model IDs

```ts
GEMINI_MODEL_IDS = {
  cheap:     "gemini-3.1-flash-lite",
  normal:    "gemini-3.1-pro-preview",   // chat + summaries + tag cleanup
  embedding: "gemini-embedding-2",
}
CHAT_MODEL = "gemini-3.1-pro-preview"
```

### R2 Key Path Convention

```
users/{userId}/bookmarks/{bookmarkId}/{filename}
```

Where `{filename}` is one of:
- `screenshot.png` — Cloudflare screenshot
- `pdf-screenshot.png` — PDF screenshot
- `og-image.{ext}` — OG or product image
- `favicon.{ext}` — favicon
- `{Date.now()}-{fileName}` — user uploads (screenshot upload, image bookmark)
- `avatar/{Date.now()}-avatar.{ext}` — user avatar (path is `users/{userId}/avatar/...`)

Public CDN URL: `${R2_URL}/${key}` (no trailing slash on `R2_URL`).

### Upload Guards (enforced in `files/actions.ts` and `users/actions.ts`)

```ts
MAX_FILE_SIZE = 2 * 1024 * 1024  // exactly 2,097,152 bytes
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
```

### URL Tracking-Param Strip List

Located in `bookmarks/mutations.ts` (inline helper `cleanUrl`) or a shared `utils/url.ts`. The exact list of 58+ parameters from Spec 02 §1.16 must be included verbatim. Key parameters: `utm_source, utm_medium, utm_campaign, fbclid, gclid, ref, source, cid, sid, tid` (full list in spec).

### Month Key Format

```ts
monthKey = `${year}-${String(month + 1).padStart(2, "0")}`  // e.g. "2026-06"
// e.g. new Date(2026, 5) → "2026-06"
startOfMonth = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
```

### Processing Step Numbers (for `bookmark.processingStep`)

```ts
0  = pending
1  = get-bookmark
2  = scrap-content
3  = extract-metadata
4  = summary-page
5  = find-tags
6  = screenshot
7  = saving
8  = finish
9  = transcript-video
10 = describe-screenshot
11 = get-tweet
```

### Stripe API Version

```ts
STRIPE_API_VERSION = "2025-02-24.acacia"
```

---

## E. Hard Rules Every Author Must Follow

### E.1 Index usage

- **ONLY use `.withIndex(...)` for queries** — never call `.filter()` as the primary scan strategy.
- Never use unbounded `.collect()` on large tables. Always `.take(n)` or `.paginate(opts)`.
- Index names to use:
  - Bookmarks: `by_user_created`, `by_user_status`, `by_user_url`, `by_user_starred`, `by_user_read`
  - Tags: `by_user`, `by_user_name`
  - BookmarkTags: `by_bookmark`, `by_tag`, `by_user_tag`
  - BookmarkOpens: `by_bookmark_user`, `by_user_opened`
  - BookmarkProcessingRuns: `by_user_started`, `by_bookmark`
  - Subscriptions: `by_user`, `by_stripe_subscription`, `by_stripe_customer`
  - UserCounters: `by_user`
  - ChatConversations: `by_user_updated`
  - ChatMessages: `by_conversation`
  - ChatUsages: `by_user_created`

### E.2 userId always from ctx.user.id

- **NEVER accept `userId` as a client argument in `authQuery`/`authMutation`/`authAction`**.
- Always derive from `ctx.user.id` (set by the custom function builders).
- Internal functions (`internalQuery`, `internalMutation`, `internalAction`) may accept `userId` as an arg since they are not client-callable.

### E.3 Typed errors — always use utils/errors.ts

```ts
throwUnauthorized()            // 401 — not logged in
throwForbidden(message)        // 403 — logged in but not allowed
throwNotFound(message)         // 404 — resource not found or wrong owner
throwValidationError(message)  // 400 — bad input
throwLimitReached(message)     // plan limit hit
throwConfigurationError(msg)   // missing env var / misconfiguration
```

Never throw raw `Error` from Convex functions. Never return `null` as a sentinel for "not found" in mutations (use `throwNotFound`).

### E.4 `"use node"` only in pure-action files

- Files with `"use node"` directive may ONLY contain `action`, `internalAction`, or `httpAction` registrations plus plain TypeScript helpers.
- **Never mix queries or mutations with `"use node"` files.** Convex will reject this.
- Files requiring `"use node"`: anything using `@aws-sdk/client-s3`, `mime-types`, Node `Buffer`, `@ai-sdk/google`, `@danielxceron/youtube-transcript`, `stripe`, `@react-email/render`, `cheerio` (Node API paths), `sharp`, `crypto` (Node HMAC).

### E.5 Single combined searchEmbedding

- There is ONE embedding vector per bookmark: `searchEmbedding` (1536-d, indexed).
- Embedding text: `title + "\n" + vectorSummary`. If `vectorSummary` is empty, embed `title` alone.
- Set `bookmark.embeddingModel = "gemini-embedding-2:1536"` on every embedding write.
- The `0.2/0.8` weighting from the old SQL is already baked into the combined document text (dominant summary portion) — do NOT re-implement the weighting at query time.
- The vector index `by_search_embedding` must have `filterFields: ["userId", "type"]`.

### E.6 vectorSearch only in actions

- `ctx.vectorSearch(...)` is only available in actions (not queries or mutations).
- Vector search must live in `search/actions.ts` and be called only from actions or httpActions.

### E.7 Mutations stay transactional (no network/CPU)

- Mutations must not call external APIs (Stripe, Gemini, R2, etc.).
- Heavy work (embeddings, screenshots, R2 uploads) goes in actions or scheduled actions.
- Use `ctx.scheduler.runAfter(0, ...)` from mutations to dispatch work to actions.
- Counter updates (bookmarkCount, monthlyRuns) must happen in the **same mutation** as the bookmark insert/delete — never in a separate mutation.

### E.8 Chat usage check-and-increment in ONE authMutation

- `checkAndIncrementUsage` is `internalMutation` — one atomic read+write.
- **Never split** into a query (to check count) + separate mutation (to insert). This creates TOCTOU races.
- Called from `chat/stream.ts` httpAction via `ctx.runMutation(internal.chat.mutations.checkAndIncrementUsage, { userId })`.

### E.9 Public DTO whitelist — always enforced

- `getByPublicSlug` and `/api/v1/public/:slug/bookmarks` MUST map results through the `PublicBookmarkDTO` whitelist.
- `starred` and `read` are hardcoded to `false` regardless of actual values.
- Fields `note`, `userId`, `vectorSummary`, `searchEmbedding`, `embeddingModel`, `processingError` are never included in any public response.

### E.10 Zod-validate all httpAction inputs

- Every httpAction that accepts query params or request body must validate with Zod before using values.
- Invalid inputs return `Response.json({ error: "...", success: false }, { status: 400 })`.
- Limit params must be clamped: internal list `1-50`, v1 API `1-100`.
- `matchingDistance` in v1 API: `0.1-2.0`.

### E.11 Metadata `transcript` stripping

- `cleanMetadata(metadata)` from `bookmarks/dto.ts` must be called on every bookmark returned to clients in list, search, and detail endpoints.
- Exception: the pipeline itself stores transcript internally — it is never sent over the wire.

### E.12 Ownership defense in depth

- Even when `vectorSearch` or an index query is scoped to `userId`, the `loadForSearch` internal query must re-check `doc.userId === userId` for every loaded document.
- All mutations checking ownership should use `throwNotFound` (not `throwForbidden`) to avoid leaking resource existence.

### E.13 Banned user check in auth builders

- `authQuery`, `authMutation`, `authAction` builders (in `functions.ts`) must check `user.banned === true && (!user.banExpires || user.banExpires > Date.now())` and throw `throwForbidden("Account banned")` before executing the handler. This is already in the existing `requireAuth` implementation.

### E.14 httpAction auth for stream endpoint

- The `/chat` httpAction must guard auth with try/catch around `ctx.auth.getUserIdentity()` — it throws, does not return null.
- Pattern: `let identity; try { identity = await ctx.auth.getUserIdentity(); } catch { return new Response("Unauthorized", { status: 401 }); } if (!identity) return new Response("Unauthorized", { status: 401 });`

### E.15 Unsubscribe link security

- All unsubscribe links in marketing emails MUST include an HMAC-SHA256 token: `HMAC(BETTER_AUTH_SECRET, userId + ":" + timestamp)`.
- The bare `userId`-only unsubscribe URL pattern from the old web app MUST NOT be reproduced.
- Token verification happens in `auth/mutations.ts unsubscribe` httpAction.

### E.16 Never create missing tables in schema.ts

- The schema in `packages/backend/convex/schema.ts` already exists and is built. Module authors must not add top-level table definitions outside the existing schema file.
- Exception: `changelogDismissals` table is new and must be added to `schema.ts`.
- Any new table additions must be coordinated as a schema PR first.

---

*End of 00-CONTRACT.md*
