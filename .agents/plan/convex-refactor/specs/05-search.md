# Porting Spec 05: Search (Phase 07)

**Area:** Search — vector similarity, tag, domain, and default-browsing paths  
**Target Convex file:** `packages/backend/convex/search/actions.ts`  
**Depends on:** Phase 04 schema (`by_search_embedding` vector index), Phase 06 (embeddings populated)

---

## 1. Current File Inventory

| File | Responsibility |
|------|---------------|
| `apps/web/src/routes/api.bookmarks.ts` (GET branch) | HTTP entry point — parses query params, calls `cachedAdvancedSearch`, returns JSON response |
| `apps/web/src/lib/search/cached-search.ts` | Redis-backed cache wrapper around `optimizedSearch`; determines query type and sets cache TTL |
| `apps/web/src/lib/search/optimized-search.ts` | **Primary path.** Builds a single unified SQL CTE query combining tag/domain/vector strategies with `final_score = base_score + LOG(open_count+1)*10`; handles three fallback levels when no results found |
| `apps/web/src/lib/search/advanced-search.ts` | **Fallback path.** Routes to `getDefaultBookmarks`, `getBookmarksByType`, or `performMultiLevelSearch` depending on what params are set |
| `apps/web/src/lib/search/search-combiners.ts` | `SearchResultCombiner` class (tag boost ×1.5, domain add, vector boost ×0.6) + `performMultiLevelSearch` which runs tag→domain→vector in sequence; `applySearchPagination` |
| `apps/web/src/lib/search/search-by-query.ts` | Low-level Prisma/pgvector functions: `searchByDomain`, `searchByTags`, `searchByVector` (raw SQL), `searchByText` (embed then vector) |
| `apps/web/src/lib/search/search-helpers.ts` | Type definitions, `isDomainQuery`, `extractDomain`, `getBookmarkOpenCounts`, `applyOpenFrequencyBoost`, `isSearchQuery`, `buildSpecialFilterConditions`, `bookmarkToSearchResult`, `sortSearchResults`, `paginateResults` |
| `apps/web/src/lib/search/default-browsing.ts` | `getDefaultBookmarks` (ULID cursor pagination, newest first, no score) and `getBookmarksByType` |
| `apps/web/src/lib/search/embedding-cache.ts` | `EmbeddingCache` class — Redis-backed, key `embedding:v1:<model>:<sha256>`, TTL 7 days, validates model matches on read |
| `apps/web/src/lib/search/search-cache.ts` | `SearchCache` class — Redis-backed, key `search:v2:<userId>:<queryHash>:<filterHash>`, variable TTL by query type, also `invalidateUserSearches` / `invalidateBookmarkUpdate` |
| `apps/web/src/lib/search/cache-invalidation.ts` | `CacheInvalidation` helpers — called on bookmark create/update/delete/tag-change to invalidate `SearchCache` |
| `apps/web/src/lib/search/redis-utils.ts` | `parseRedisResponse<T>` — trivial cast, Upstash deserializes automatically |
| `apps/web/src/lib/redis.ts` | Upstash Redis client: `new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })` |
| `apps/web/src/lib/gemini.ts` | Gemini model/embedding constants and `embedGeminiQuery` / `embedGeminiDocuments` |
| `apps/web/src/features/app/use-bookmarks.ts` | React hook — `useInfiniteQuery` calling `GET /api/bookmarks` with debounced query |
| `apps/web/src/lib/chat/tools/search-bookmarks.ts` | AI chat tool that calls `searchByText` with `matchingDistance: 0.8` |

---

## 2. Business Logic — Complete Routing Decision Tree

The entrypoint `advancedSearch` (and its optimized equivalent) applies this decision tree in order:

```
1. isSearchQuery(query) === false  →  getDefaultBookmarks (ULID cursor, no score, no boost)
2. types.length > 0 AND query blank AND tags blank  →  getBookmarksByType (ULID cursor, no score)
3. Any combination of query/tags/types with a real query text  →  performMultiLevelSearch / OptimizedSearchQuery
   a. tags.length > 0  →  tag search (base_score = tagMatchRatio * 100 * 1.5)
   b. isDomainQuery(query)  →  domain search (base_score = 150 exact match / 120 partial)
   c. else  →  embed query with Gemini RETRIEVAL_QUERY task → vector search with matchingDistance filter
   Dedup by id, apply open-frequency boost, sort by final_score DESC, id DESC
```

`isSearchQuery(query)` returns `true` only if `query && query.trim() !== ""` — an empty string or undefined is browsing mode.

---

## 3. Embedding Model Constants (MUST preserve exactly)

From `apps/web/src/lib/gemini.ts`:

```typescript
GEMINI_MODEL_IDS.embedding = "gemini-embedding-2"
GEMINI_EMBEDDING_DIMENSIONS = 1536
GEMINI_EMBEDDING_CACHE_MODEL = "gemini-embedding-2:1536"   // used as embeddingModel field value
GEMINI_EMBEDDING_METADATA_VALUE = "gemini-embedding-2:1536"  // stored in bookmark.metadata.embeddingModel (Postgres)
                                                               // → maps to bookmark.embeddingModel (Convex)
```

The **document embedding** uses `taskType: "RETRIEVAL_DOCUMENT"` (set when processing bookmarks).  
The **query embedding** uses `taskType: "RETRIEVAL_QUERY"` (set at search time).

Both use `outputDimensionality: 1536` via the `providerOptions.google` field of the AI SDK.

**Embedding model version guard:** In the current SQL query, only bookmarks with `metadata->>'embeddingModel' = 'gemini-embedding-2:1536'` are included in vector search. In Convex, this is the top-level `embeddingModel` field. The search action must either use it as a `vectorIndex` filterField or post-filter after retrieval.

---

## 4. The Weighted Distance Formula (pgvector, to be replaced)

The current SQL computes a weighted cosine distance across two embedding columns:

```sql
0.2 * COALESCE("titleEmbedding" <=> $1::vector, 1) +
0.8 * COALESCE("vectorSummaryEmbedding" <=> $1::vector, 1)
```

- `titleEmbedding` weight: **0.2**
- `vectorSummaryEmbedding` weight: **0.8**
- Missing embeddings default to distance `1` (worst case)

**In Convex, this multi-vector formula is dropped.** The re-embedding strategy bakes this weighting into the document text before embedding:
- Combined text = `title + "\n" + vectorSummary` (the 0.8 weight for summary is honored by making it the dominant portion of the combined embedding input)
- Stored as a single `searchEmbedding` (1536-d) in the `bookmarks` table
- Indexed under `by_search_embedding` vector index with `filterFields: ["userId", "type"]`

The implementation engineer does NOT need to replicate the `0.2/0.8` formula at query time — it is already embedded in the document vectors.

---

## 5. The matchingDistance Spread (SQL → Convex port)

The current SQL applies a dynamic distance cutoff:

```sql
WHERE distance <= (
  SELECT MIN(distance) + $3
  FROM bookmark_distances
  WHERE "userId" = $1
    AND metadata->>'embeddingModel' = '...'
    -- + type/tag filters
)
```

- `$3` is `matchingDistance` (default `0.1`)
- This keeps only results within `MIN_DISTANCE + matchingDistance` of the best match
- Meaning: results can be at most `matchingDistance` units "worse" than the best result

**In Convex:**
1. Call `ctx.vectorSearch("bookmarks", "by_search_embedding", { vector, limit: 50, filter: q => q.eq("userId", userId) })`
2. The results come back as `{ _id, _score }` sorted by score descending (higher = more similar)
3. Find `maxScore = results[0]._score`
4. Keep only results where `_score >= maxScore - matchingDistance`
   - Note: Convex `_score` is cosine similarity (higher is better); the SQL uses cosine distance (lower is better). The relationship is `_score ≈ 1 - distance`, so `MIN_distance + x` maps to `maxScore - x`.
5. Default `matchingDistance = 0.1`

**Fallback behavior** (from `optimized-search.ts`): if zero results are returned after the matchingDistance filter:
1. First retry with `matchingDistance = 1.0` (effectively no spread filter)
2. Second retry: skip the spread filter entirely, return top results ordered by raw score

This three-level fallback MUST be preserved.

---

## 6. Open-Frequency Boost Formula (MUST preserve exactly)

```typescript
function applyOpenFrequencyBoost(score: number, openCount: number): number {
  if (openCount === 0) return score;
  const boost = Math.log(openCount + 1) * 10;
  return score + boost;
}
```

- Applied to ALL search modes: tag, domain, vector, combined
- Applied AFTER base score is computed (additive)
- `Math.log` is natural logarithm
- Coefficient: **10**
- Logarithmic to prevent heavily-opened bookmarks from completely dominating
- `openCount` = number of rows in `bookmarkOpens` for this `(bookmarkId, userId)` pair

**In Convex:** load open counts from `bookmarkOpens` table using `by_bookmark_user` index, then apply the same formula.

---

## 7. Score Computation per Strategy

### Vector search base score

From `optimized-search.ts` SQL CTE:
```sql
(100 - ((0.2 * COALESCE(b."titleEmbedding" <=> $N::vector, 1) +
          0.8 * COALESCE(b."vectorSummaryEmbedding" <=> $N::vector, 1)) * 100)) * 0.6 as base_score
```

Simplified for Convex (single embedding, `_score` = cosine similarity in `[-1, 1]`, typical `[0, 1]` range):
```
base_score = 100 * _score * 0.6
```

The `* 0.6` damping factor is important — it leaves room for tag/domain scores (100–150) to rank above pure vector matches. Also matches the `addVectorResults` boost of `0.6` in `SearchResultCombiner.addVectorResults`.

From `search-by-query.ts searchByVector`:
```typescript
const baseScore = Math.max(0, 100 * (1 - bookmark.distance));
```
(Using cosine distance `distance`, then `applyOpenFrequencyBoost`)

### Tag search base score

```typescript
const tagMatchRatio = matchedTags.length / tags.length;
const baseScore = tagMatchRatio * 100;
// Then in combiner: score * 1.5 boost
```

Combined: `(matchedTags / totalTags) * 100 * 1.5`

In `OptimizedSearchQuery.buildTagSearchCTE`:
```sql
(COUNT(DISTINCT bt."tagId")::float / ${tags.length}) * 100 * 1.5 as base_score
```

### Domain search base score

```typescript
const isExactMatch = bookmarkDomain === domain;
const baseScore = isExactMatch ? 150 : 120;
```

In SQL CTE:
```sql
CASE
  WHEN b.url ~ '^https?://([^/]*\.)?${escapedDomain}(/.*)?$' THEN 150.0
  ELSE 120.0
END as base_score
```

### Combined search deduplication

When a bookmark appears in multiple strategies, scores are summed:
- `SearchResultCombiner.addDomainResults`: if already in map, `existing.score + result.score`, matchType → "combined"
- `SearchResultCombiner.addVectorResults`: if already in map, `existing.score + result.score * 0.6`, matchType → "combined"
- Tag results always overwrite first (not additive with each other)

In `OptimizedSearchQuery`, deduplication uses `DISTINCT ON (id)` keeping `MAX(final_score)`.

### Final score

```
final_score = base_score + COALESCE(LOG(open_count + 1) * 10, 0)
```

The SQL uses PostgreSQL `LOG` which is natural log (`ln`), matching JavaScript `Math.log`.

### Score output range

The score field in the response is not normalized to 0–100 — it can exceed 100 because:
- Domain exact match: `150 + open_boost`
- Tag match with opens: `150 + open_boost` possible
- Vector: `0–60 + open_boost`

---

## 8. Domain Query Detection

```typescript
function isDomainQuery(query: string): boolean {
  const cleanQuery = query.trim().toLowerCase();
  const domainPatterns = [
    /^[a-z0-9.-]+\.[a-z]{2,}$/i,           // domain.com
    /^www\.[a-z0-9.-]+\.[a-z]{2,}$/i,      // www.domain.com
    /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i, // http(s)://domain.com
  ];
  return domainPatterns.some((pattern) => pattern.test(cleanQuery));
}
```

```typescript
function extractDomain(query: string): string {
  let domain = query.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "");   // strip protocol
  domain = domain.replace(/^www\./, "");          // strip www.
  domain = domain.split("/")[0] || domain;        // strip path
  domain = domain.split("?")[0] || domain;        // strip query string
  domain = domain.split("#")[0] || domain;        // strip fragment
  return domain;
}
```

Domain matching logic in `searchByDomain`:
```typescript
const bookmarkDomain = extractDomain(bookmark.url);
const isValid = bookmarkDomain.includes(domain) || domain.includes(bookmarkDomain);
const isExactMatch = bookmarkDomain === domain;
```

In Convex, domain search queries the `by_user_url` index (which stores raw URLs). The filter must use a contains/ILIKE equivalent — Convex does not have ILIKE. Options:
1. Use the `by_title_text` searchIndex on `url` if added (requires adding `url` as a searchIndex)
2. Or load all user bookmarks paginated and filter in action (not recommended for large sets)
3. Best approach: use a Convex `searchIndex` on `url` field with `filterFields: ["userId"]`, or rely on the `by_user_url` index + Convex's built-in `.filter()` with regex. Note: Convex `.filter()` is post-index, so filter by userId via index then filter URL in action code.

---

## 9. Special Filters (READ/UNREAD/STAR)

```typescript
type SpecialFilter = "READ" | "UNREAD" | "STAR"
```

- `READ`: `read === true AND type IN ["ARTICLE", "YOUTUBE"]`  
- `UNREAD`: `read === false AND type IN ["ARTICLE", "YOUTUBE"]`  
- `STAR`: `starred === true`  
- Multiple filters are OR'd together (not AND'd)

```typescript
const READABLE_BOOKMARK = ["ARTICLE", "YOUTUBE"] satisfies BookmarkType[];
```

The type restriction for READ/UNREAD is important — these filters only apply to readable content types.

---

## 10. Status Filter in Search Mode

When `isSearchQuery === true`, only bookmarks with `status === "READY"` are included in vector/tag/domain results.

When browsing (no query), bookmarks of any status are shown (so users can see PENDING/PROCESSING items in their feed).

---

## 11. Pagination

### Default/type browsing pagination (ULID cursor)

```typescript
// Cursor = last bookmark id (ULID, lexicographically sortable by time)
// Query: WHERE id < cursor ORDER BY id DESC LIMIT limit+1
// hasMore = results.length > limit
// nextCursor = bookmarks[bookmarks.length - 1]?.id
```

ULID IDs sort by time, so `id < cursor` correctly paginates "older than" the last seen item.

### Search result pagination (offset-based in optimizedSearch)

```typescript
// cursor = string offset number (e.g. "20", "40")
// offset = parseInt(cursor) || 0
// nextCursor = String(offset + limit) if hasMore
// hasMore = results.length === limit (not limit+1 trick)
```

The optimized search uses SQL OFFSET pagination, which does not support cursor-based pagination. The advanced-search fallback uses ID-based cursor pagination within the sorted in-memory results array:

```typescript
function paginateResults(results, cursor, limit) {
  const startIndex = cursor ? results.findIndex(r => r.id === cursor) + 1 : 0;
  const paginatedResults = results.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedResults.length > limit;
  const bookmarks = hasMore ? paginatedResults.slice(0, -1) : paginatedResults;
  const nextCursor = hasMore ? bookmarks[bookmarks.length - 1]?.id : undefined;
  return { bookmarks, nextCursor, hasMore };
}
```

**In Convex:** Since Convex vector search returns up to 256 results in one call (limited by `limit: 50` here), full results are loaded in memory and paginated in the action. Use the ID-cursor approach from `paginateResults` above.

---

## 12. HTTP Request/Response Shape (GET /api/bookmarks)

**Request query parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `query` | string | `""` | none (empty = browsing) |
| `types` | comma-separated BookmarkType | `""` | filtered to valid BookmarkType enum values |
| `tags` | comma-separated string | `""` | split, filter empty |
| `special` | comma-separated "READ"\|"UNREAD"\|"STAR" | `""` | filtered to valid values |
| `limit` | number | `20` | `z.coerce.number().int().min(1).max(50)` |
| `cursor` | string | `undefined` | pass-through |
| `matchingDistance` | number | `0.1` | `Number(value)` |

**Auth:** `requireUser(request)` — must be authenticated. Returns 401 if not.

**Response body:**
```typescript
{
  bookmarks: SearchResult[],
  nextCursor?: string,
  hasMore: boolean,
  totalCount?: number,   // undefined in optimized path
  queryTime?: number,    // ms, only set when NOT from cache
  fromCache?: boolean    // true if served from Redis cache
}
```

**SearchResult shape** (as returned by client — same fields clients depend on):
```typescript
{
  id: string,
  url: string,
  title: string | null,
  summary: string | null,
  preview: string | null,          // R2 screenshot URL
  type: BookmarkType | null,
  status: BookmarkStatus,
  ogImageUrl: string | null,
  ogDescription: string | null,
  faviconUrl: string | null,
  score: number,
  matchType: "tag" | "vector" | "combined",
  matchedTags?: string[],
  tags?: { tag: { id: string, name: string, type: string } }[],
  createdAt: Date,
  metadata?: object,              // transcript STRIPPED from metadata (see cleanMetadata)
  openCount?: number,
  starred?: boolean,
  read?: boolean,
}
```

**IMPORTANT — metadata cleaning:** The `cleanMetadata` function strips the `transcript` field from metadata before returning to client:
```typescript
function cleanMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return metadata;
  const { transcript: _, ...cleanedMetadata } = metadata;
  return cleanedMetadata;
}
```
This must be preserved in the Convex DTO to avoid sending large transcript text to the frontend.

---

## 13. Redis Cache (TO BE DROPPED)

### SearchCache

- Redis client: Upstash Redis, env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Key format: `search:v2:<userId>:<queryHash(8 chars MD5)>:<filterHash(8 chars MD5)>`
- queryHash input: `"${query}:${matchingDistance}:${cursor}:${limit}"`
- filterHash input: JSON of `{ types: sorted, tags: sorted, special: sorted }`
- TTL by query type:
  - `default` (no query/tags/types): 1800s (30 min)
  - `tag`: 900s (15 min)
  - `domain`: 1200s (20 min)
  - `vector`: 600s (10 min)
  - `combined`: 450s (7.5 min)
  - empty results: 300s (5 min)
- Invalidation: `redis.keys("search:v2:<userId>:*")` → `redis.del(...keys)` on any bookmark mutation

### EmbeddingCache

- Key format: `embedding:v1:<model>:<sha256(text.toLowerCase().trim())>`
- TTL: 604800s (7 days)
- Model verification: if `result.model !== model`, delete key and return null
- Current model key value: `"gemini-embedding-2:1536"`

**Migration decision (from 07-search.md):** Drop both caches entirely. Convex queries are reactive and fast. If Gemini embedding latency is a practical problem, optionally add a `queryEmbeddingCache` table keyed by `(model, textHash)` with TTL via a cron sweep — but this is optional and should not be built in v1.

---

## 14. External API: Gemini Embedding

**SDK:** `@ai-sdk/google` via the `ai` package (`embed` function)

**For query embedding:**
```typescript
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({});
const result = await embed({
  model: google.embeddingModel("gemini-embedding-2"),
  value: queryText,
  providerOptions: {
    google: {
      outputDimensionality: 1536,
      taskType: "RETRIEVAL_QUERY",    // IMPORTANT: different from document embedding
    },
  },
});
// result.embedding: number[]  (1536-d)
```

**Env var:** `GOOGLE_GENERATIVE_AI_API_KEY` (consumed by `@ai-sdk/google` automatically)

**Note:** `embedGeminiQuery` in the current code uses the AI SDK's `embed()` helper. The Convex action must also use `"use node"` since the Google Generative AI SDK requires Node.js runtime.

---

## 15. Target Convex Files and Function Signatures

### `packages/backend/convex/search/actions.ts`

```
"use node";  // required for @ai-sdk/google
```

**Functions to implement:**

#### `export const search = action(...)` — public, wrapped with `authAction`

Args (exact parity with current HTTP params):
```typescript
{
  query: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  types: v.optional(v.array(bookmarkType)),
  specialFilters: v.optional(v.array(v.union(v.literal("READ"), v.literal("UNREAD"), v.literal("STAR")))),
  limit: v.optional(v.number()),             // default 20, max 50
  cursor: v.optional(v.string()),
  matchingDistance: v.optional(v.number()),  // default 0.1
}
```

Returns: `SearchResponse` shape (see Section 12 above)

Handler flow:
1. `const { user } = await requireAuth(ctx)`
2. Validate `limit` (1–50, default 20)
3. Check `isSearchQuery(query)` — if false, delegate to `ctx.runQuery(internal.bookmarks.queries.listDefault, {...})`
4. Check type-only: if `types.length > 0 && !query && !tags.length` → delegate to `ctx.runQuery(internal.bookmarks.queries.listByType, {...})`
5. Check `isDomainQuery(query)` → `ctx.runQuery(internal.search.queries.searchByDomain, {...})`
6. Check tags-only (no query) → `ctx.runQuery(internal.search.queries.searchByTags, {...})`
7. Main vector path:
   a. Embed query: `await embedQueryGemini(args.query)` → `number[]` (1536-d, RETRIEVAL_QUERY)
   b. `ctx.vectorSearch("bookmarks", "by_search_embedding", { vector, limit: 50, filter: q => q.eq("userId", user.id) })`
   c. Post-filter by `embeddingModel` (if not used as index filterField)
   d. Apply `matchingDistance` spread: keep `_score >= maxScore - matchingDistance`
   e. Fallback if empty: retry with `matchingDistance = 1.0`, then retry without spread
   f. Load bookmark docs + tags via `ctx.runQuery(internal.search.queries.loadForSearch, { ids, userId })`
   g. Load open counts via `ctx.runQuery(internal.bookmarkOpens.queries.getCountsByBookmarkIds, { bookmarkIds, userId })`
   h. Compute scores: `baseScore = 100 * _score * 0.6` + `applyOpenFrequencyBoost(baseScore, openCount)`
   i. Sort by score DESC, id DESC
   j. Paginate with cursor logic (ID-based)
   k. Clean metadata (strip `transcript` field)
   l. Return `SearchResponse`

#### `export const searchForChat = action(...)` — public, wrapped with `authAction`

Used by AI chat tools (replaces `createSearchBookmarksTool`). 
Difference from `search`: `matchingDistance` defaults to `0.8` (not `0.1`), no pagination cursor, limit defaults to 6 (max 20).

### `packages/backend/convex/search/queries.ts`

Internal queries callable from actions:

```typescript
export const searchByDomain = internalQuery({...})
// Args: { userId, domain, types?, specialFilters? }
// Uses by_user_url index, filter URL contains domain
// Returns SearchResult[] with base scores (150 exact, 120 partial)

export const searchByTags = internalQuery({...})
// Args: { userId, tags, types?, specialFilters? }
// Uses by_user_tag index → bookmarkTags → load bookmarks
// tagMatchRatio * 100 * 1.5 as baseScore
// Returns SearchResult[]

export const loadForSearch = internalQuery({...})
// Args: { ids: Id<"bookmarks">[], userId }
// Validates ownership (userId check on each doc)
// Loads bookmark + joins tags via by_bookmark index
// Returns bookmark docs with tags[]
```

### Helper functions (non-Convex, in `search/helpers.ts`)

Pure TypeScript, no Convex runtime dependency:

```typescript
isDomainQuery(query: string): boolean
extractDomain(query: string): string
isSearchQuery(query?: string): boolean
applyOpenFrequencyBoost(score: number, openCount: number): number
  // formula: score + Math.log(openCount + 1) * 10
sortSearchResults(results): results sorted by score DESC, id DESC
paginateResults(results, cursor?, limit): { bookmarks, nextCursor?, hasMore }
cleanMetadata(metadata): metadata without transcript field
bookmarkToSearchResult(bookmark, score, matchType, matchedTags?, openCount?): SearchResult
```

---

## 16. Frontend Wiring (Phase 16 concern)

The current `use-bookmarks.ts` calls `GET /api/bookmarks` via `upfetch`. After migration:

- Replace `useInfiniteQuery` calling `upfetch("/api/bookmarks")` with `useInfiniteQuery` calling `convexAction(api.search.actions.search, {...})` 
- The action is not reactive (unlike queries), which is fine for search
- The "no query" browsing path should use reactive `useQuery(convexQuery(api.bookmarks.queries.list, {...}))` for real-time updates as bookmarks are processed
- Query key structure must be preserved for `useRefreshBookmarks` to work: `["bookmarks", searchQuery, types, tags, special, matchingDistance, Boolean(query)]`

The `createSearchBookmarksTool` in chat tools should call `api.search.actions.searchForChat` instead.

---

## 17. Security / Ownership Guards (Phase 17 inputs)

1. **Auth required:** `requireAuth(ctx)` must be called at the start of every search action. No anonymous search.
2. **userId scoping:** ALL database reads must be scoped to `user.id`. The `vectorSearch` filter `q.eq("userId", user.id)` is mandatory.
3. **loadForSearch ownership:** The internal query that loads bookmark docs by IDs must re-check `doc.userId === userId` for every document, even though the vector search was filtered — defense in depth.
4. **limit validation:** Client-supplied `limit` must be clamped to 1–50. Never allow unbounded reads.
5. **No client-passed userId:** The `userId` is always derived from `requireAuth(ctx)`, never from action args.
6. **matchingDistance:** No strict validation needed (it's a float that controls result spread, extreme values just return more/fewer results).

---

## 18. Edge Cases and Known Gotchas

1. **Single embedding vs. two-field weighting:** The `0.2/0.8` formula is baked into the combined document embedding during processing (Phase 06). The search action does NOT need to replicate this math — it uses the single `searchEmbedding` field. However, the score scale may differ slightly from the Postgres system during the migration window (Phase 14 verification needed).

2. **Convex `_score` range:** Convex returns cosine similarity scores. Range is theoretically `[-1, 1]` but practically `[0, 1]` for non-negative embeddings. The formula `100 * _score * 0.6` maps to `[0, 60]` before open boost. The matchingDistance spread uses `maxScore - matchingDistance` in score space (not distance space) — this is the inverse of the SQL `MIN(distance) + matchingDistance`.

3. **embeddingModel filter:** In Postgres, this is `metadata->>'embeddingModel' = 'gemini-embedding-2:1536'`. In Convex, `embeddingModel` is a top-level string field. The Convex vector index currently declares `filterFields: ["userId", "type"]` (from Phase 04 schema). To filter by `embeddingModel` at index level, it must be added to `filterFields` during schema definition. If not in `filterFields`, post-filter after vector search: remove results where `doc.embeddingModel !== "gemini-embedding-2:1536"`.

4. **Bookmark without embedding:** If a bookmark has no `searchEmbedding` (not yet processed), `ctx.vectorSearch` simply won't return it (undefined vectors are excluded). This is the correct behavior.

5. **Vector search limit 256:** Convex caps `ctx.vectorSearch` at 256 results per call. The current implementation uses `limit: 50`. This is fine for per-user search but be aware of the platform cap.

6. **Domain search in Convex:** Convex does not have ILIKE. Use a Convex text `searchIndex` on `url` OR load all user bookmarks via a bounded query and filter in the action. The recommended approach: add `.searchIndex("by_url_text", { searchField: "url", filterFields: ["userId"] })` to the bookmarks table schema (requires schema change from Phase 04), then use `ctx.db.search("bookmarks", "by_url_text", { filter: q => q.eq("userId", userId), query: domain })`.

7. **Tag-only filter with no query (special case):** If `tags.length > 0` AND `query === ""`, the `advanced-search.ts` still routes to `performMultiLevelSearch` (not `getBookmarksByType`) because `isSearch === false` is only triggered by no-query, no-tags, no-types. But `optimizedSearch` handles it by only activating the tag CTE. In Convex, tags-only with no query is a separate fast path: query `bookmarkTags` by `by_user_tag` index for each tag, collect bookmarkIds, load bookmarks, score by `tagMatchRatio * 100 * 1.5`, apply open boost.

8. **URL as search query:** The current `use-bookmarks.ts` has a special case: if `searchQuery` parses as a valid URL (`URL_SCHEMA.safeParse`), return empty results immediately without calling the API. This prevents accidentally embedding a full URL as a search query. Preserve this in the frontend hook.

9. **Metadata `transcript` stripping:** This is critical for performance. YouTube transcripts can be very large. The `cleanMetadata` function strips `transcript` from the response. The Convex DTO mapper must do the same.

10. **`fromCache` / `queryTime` response fields:** These were Redis cache artifacts. After migration, `fromCache` will always be `false` (or omitted), and `queryTime` can be added via `performance.now()` at action start/end if desired (cosmetic only).

11. **Debounced query in frontend:** `use-bookmarks.ts` uses `useDebounce` to avoid firing search on every keystroke. The debounced value is what actually triggers the Convex action call. This debouncing lives in the React hook and is independent of the backend.

12. **`READABLE_BOOKMARK` constant:** The READ/UNREAD special filters restrict to `["ARTICLE", "YOUTUBE"]` types only. This must be preserved in the Convex filter logic.

---

## 19. Files to Delete After Migration

- `apps/web/src/lib/search/*` (entire directory)
- `apps/web/src/lib/redis.ts`
- `apps/web/src/routes/api.bookmarks.ts` (GET branch; POST branch moves to `api.bookmarks.mutations.create`)
- Remove env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## 20. Summary of Required Convex Schema Additions (vs. Phase 04)

The Phase 04 schema is largely complete. Additional considerations for search:

1. Add `.searchIndex("by_url_text", { searchField: "url", filterFields: ["userId"] })` to `bookmarks` table if domain search via Convex search index is desired (recommended over in-memory filtering)
2. The `embeddingModel` field is already in Phase 04 schema as a top-level field — confirm it is in `filterFields` of the vector index if model-version filtering at index level is needed
3. `bookmarkOpens.by_bookmark_user` index is already declared in Phase 04 — needed for open count queries
