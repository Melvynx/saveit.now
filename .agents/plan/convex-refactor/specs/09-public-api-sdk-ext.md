# Spec 09 — Public API (v1), SDK, CLI, and Browser Extensions

**Phase refs:** Phase 12 (public API + extensions), Phase 17 B4/B5/B6/B8  
**Goal:** port every `/api/v1/*` endpoint, the public slug endpoint, and the
browser-extension bookmark/screenshot endpoints to Convex, keeping the exact
request/response JSON shapes that the SDK, CLI, and extensions depend on.

---

## 1. Inventory of current source files

| File | Responsibility |
|------|----------------|
| `apps/web/src/routes/api.v1.bookmarks.ts` | `GET /api/v1/bookmarks` (search/list) and `POST /api/v1/bookmarks` (create) — API-key auth via `apiRoute` |
| `apps/web/src/routes/api.v1.bookmarks.$bookmarkId.ts` | `DELETE /api/v1/bookmarks/:bookmarkId` — API-key auth |
| `apps/web/src/routes/api.v1.bookmarks.random.ts` | `GET /api/v1/bookmarks/random` — picks a random unopened bookmark, marks it opened, returns bookmark + remaining count |
| `apps/web/src/routes/api.v1.tags.ts` | `GET /api/v1/tags` — paginated tag list with bookmark counts |
| `apps/web/src/routes/api.v1.public.$slug.bookmarks.ts` | `GET /api/v1/public/:slug/bookmarks` — unauthenticated public profile search; field whitelist enforced; `starred`/`read` forced to `false` |
| `apps/web/src/routes/api.bookmarks.ts` | `GET /api/bookmarks` + `POST /api/bookmarks` — **session-cookie** auth used by browser extensions |
| `apps/web/src/routes/api.bookmarks.$bookmarkId.upload-screenshot.ts` | `POST /api/bookmarks/:bookmarkId/upload-screenshot` — session-cookie auth; file upload to R2/S3 |
| `apps/web/src/lib/safe-route.ts` | `apiRoute` builder: parses `Authorization: Bearer`, validates API key, injects `{ user, apiKey }` into handler context; `userRoute` builder uses session cookie |
| `apps/web/src/lib/auth/api-key-auth.ts` | `validateApiKey(request)` — calls `auth.api.verifyApiKey`, resolves userId, checks `apiAccess === 1` (pro gate) |
| `apps/web/src/lib/auth-limits.ts` | `AUTH_LIMITS`, `getAuthLimits()` — free/pro limit constants; `apiAccess: 0` (free) vs `apiAccess: 1` (pro) |
| `apps/web/src/lib/cors.ts` | `allowedOrigins` array, `updateHeaders()` — CORS logic for cross-origin requests (extensions, mobile, previews) |
| `apps/web/src/lib/api/parse-bookmark-body.ts` | Multipart and JSON body parsing for bookmark create; embedded file-size (2 MB) and MIME-type checks |
| `packages/saveit/src/sdk.ts` | `Saveit` class — `bookmarks.list/create/delete/random`, `tags.list` |
| `packages/saveit/src/http.ts` | `HttpClient` — `DEFAULT_BASE_URL`, `Authorization: Bearer`, retry/timeout logic, error extraction |
| `packages/saveit/src/types.ts` | All TypeScript types (`Bookmark`, `Tag`, `SaveitOptions`, …) — defines the public SDK contract |
| `packages/saveit/src/errors.ts` | `SaveitApiError`, `SaveitConfigError` — client reads `error` or `error.message` field from JSON body |
| `packages/saveit/src/index.ts` | Package entry: re-exports everything including `DEFAULT_BASE_URL` |
| `packages/saveit/src/cli/sdk-factory.ts` | CLI singleton: `new Saveit({ apiKey, baseUrl: process.env.SAVEIT_BASE_URL })` |
| `packages/saveit/src/cli/auth-store.ts` | Token stored at `~/.config/tokens/saveit.txt` (0o600), also reads `SAVEIT_API_KEY` env var |
| `packages/saveit/src/cli/commands/auth.ts` | `saveit auth set/show/remove/test` |
| `packages/saveit/src/cli/commands/bookmarks.ts` | `saveit bookmarks list/create/delete/random` |
| `packages/saveit/src/cli/commands/tags.ts` | `saveit tags list` |
| `apps/chrome-extension/src/auth-client.ts` | `getSession()` via `better-auth/client` + `credentials: "include"`; `saveBookmark()` → `POST /api/bookmarks`; `uploadScreenshot()` → `POST /api/bookmarks/:id/upload-screenshot` |
| `apps/chrome-extension/src/background.ts` | Service-worker; relays `GET_SESSION`, `SAVE_BOOKMARK`, `CAPTURE_SCREENSHOT`, `UPLOAD_SCREENSHOT` messages; calls `chrome.tabs.captureVisibleTab` |
| `apps/chrome-extension/src/content.ts` | Content script UI; orchestrates the save flow including YouTube transcript extraction + screenshot upload |
| `apps/chrome-extension/src/popup.ts` | Popup UI — calls `getSession()` + `saveBookmark()` directly |
| `apps/chrome-extension/src/youtube-transcript.ts` | Multi-method YouTube transcript extraction (XHR-interception, page-data, API, captions) |
| `apps/chrome-extension/src/config.ts` | `config.BASE_URL` injected at build time as `__BASE_URL__` |
| `apps/chrome-extension/public/manifest.json` | MV3 manifest; `host_permissions: ["https://saveit.now/*"]`; `permissions: [activeTab, storage, scripting, cookies, contextMenus, tabs]` |
| `apps/firefox-extension/src/auth-client.ts` | Same as Chrome auth-client, no `bookmarkId` return on success |
| `apps/firefox-extension/src/background.ts` | `webextension-polyfill`-based; same message protocol as Chrome but **no** screenshot capture |
| `apps/firefox-extension/public/manifest.json` | MV2; `permissions: ["https://saveit.now/*", "https://www.youtube.com/*"]`; gecko id `saveit-now@melvynxdev.com` |

---

## 2. API-key authentication flow (current)

### `validateApiKey` (current: `apps/web/src/lib/auth/api-key-auth.ts`)

1. Read `Authorization` header; strip `"Bearer "` prefix.
2. Call `auth.api.verifyApiKey({ body: { key: token } })`.
3. If `!result.valid` or `!result.key` → `401`.
4. Query DB for user: `prisma.user.findUnique({ where: { id: result.key.userId }, select: { metadata, subscriptions: { plan } } })`.
5. `getAuthLimits({ plan: currentPlan }, metadata)` → if `limits.apiAccess === 0` → `403 "Pro plan required"`.
6. Return `{ success: true, user: { id }, apiKey: { id, name } }`.

### Plan/limit constants (current: `apps/web/src/lib/auth-limits.ts`)

```
AUTH_LIMITS.free  = { bookmarks: 20, monthlyBookmarkRuns: 20, monthlyChatQueries: 10, canExport: 0, apiAccess: 0 }
AUTH_LIMITS.pro   = { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 }
```

`customLimits` live in `user.metadata.customLimits` and can override individual fields (must be non-negative integers).

**Key gate for API access:** `apiAccess === 0` means free plan → deny API key usage with HTTP 403.

### `apiRoute` (current: `apps/web/src/lib/safe-route.ts`)

```
export const apiRoute = new StandardRouteBuilder(async (request) => {
  const auth = await requireApiKey(request);
  if (auth instanceof Response) return auth; // 401 or 403
  return auth; // { user: { id }, apiKey: { id, name } }
});
```

Handlers receive `ctx.user.id` and `ctx.apiKey.{ id, name }`.

---

## 3. Endpoint-by-endpoint contract (SDK-facing)

### 3.1 `GET /api/v1/bookmarks`

**Auth:** `Authorization: Bearer <apiKey>` (pro required)

**Query params (all optional):**
| Param | Validation | Default |
|-------|-----------|---------|
| `query` | string | — |
| `tags` | comma-separated strings | — |
| `types` | comma-separated `BookmarkType` values, invalid values silently dropped | — |
| `special` | `"READ"` \| `"UNREAD"` \| `"STAR"` | — |
| `limit` | `z.coerce.number().min(1).max(100)` | `20` |
| `cursor` | string | — |
| `matchingDistance` | `z.coerce.number().min(0.1).max(2)` | `0.3` |

**Response body (200):**
```json
{
  "success": true,
  "bookmarks": [
    {
      "id": "string",
      "url": "string",
      "title": "string|null",
      "summary": "string|null",
      "type": "BookmarkType|null",
      "status": "BookmarkStatus",
      "starred": "boolean",
      "read": "boolean",
      "preview": "string|null",
      "faviconUrl": "string|null",
      "ogImageUrl": "string|null",
      "ogDescription": "string|null",
      "createdAt": "string (ISO)",
      "metadata": "Record<string,unknown>|null",
      "matchedTags": "string[]",
      "score": "number",
      "matchType": "string"
    }
  ],
  "hasMore": "boolean",
  "nextCursor": "string|null"
}
```

`BookmarkType` union: `"VIDEO" | "ARTICLE" | "PAGE" | "IMAGE" | "YOUTUBE" | "TWEET" | "PDF" | "PRODUCT"`  
`BookmarkStatus` union: `"PENDING" | "PROCESSING" | "READY" | "ERROR"`

**Error responses:**
- `401` → `{ error: "Missing authorization header", success: false }` or `{ error: "Invalid API key", success: false }`
- `403` → `{ error: "Pro plan required", success: false }`
- `400` → `{ error: "Invalid query", success: false }` (Zod validation)

---

### 3.2 `POST /api/v1/bookmarks`

**Auth:** Bearer API key (pro required)

**Request body (JSON or multipart/form-data):**
```json
{
  "url": "string (required, valid URL)",
  "transcript": "string (optional)",
  "metadata": "Record<string,unknown> (optional)"
}
```

Multipart: fields `url`, `transcript`, `metadata` (JSON-stringified), `image` (optional File ≤2 MB, MIME in `[image/jpeg, image/jpg, image/png, image/webp, image/gif]`). When `image` present, it is uploaded to R2 and `url` is replaced with the CDN URL.

**Response body (201 or 200):**
```json
{
  "success": true,
  "bookmark": {
    "id": "string",
    "url": "string",
    "title": "string|null",
    "summary": "string|null",
    "type": "BookmarkType|null",
    "status": "BookmarkStatus",
    "starred": "boolean",
    "read": "boolean",
    "createdAt": "string (ISO)",
    "updatedAt": "string (ISO)"
  }
}
```

Note: the response from the v1 endpoint intentionally omits `preview`, `faviconUrl`, `ogImageUrl`, `ogDescription`, `metadata` (unlike the GET list response). The `updatedAt` field is present.

**Error responses:**
- `400` → `{ error: "URL is required", success: false }` or `{ error: "Invalid URL format", success: false }` or `{ error: <BookmarkValidationError.message>, success: false }`
- `400` (multipart) → `{ error: "File size must be less than 2MB", success: false }` or `{ error: "Only image files (JPEG, PNG, WebP, GIF) are allowed", success: false }`

**`BookmarkValidationError`** is thrown by `createBookmark` when e.g. the user has hit their bookmark count limit or the URL already exists.

---

### 3.3 `DELETE /api/v1/bookmarks/:bookmarkId`

**Auth:** Bearer API key (pro required)

**Path param:** `bookmarkId` (string, passed to `deleteBookmark({ id, userId })`)

**Response body (200):**
```json
{
  "success": true,
  "bookmark": { "id": "string" }
}
```

---

### 3.4 `GET /api/v1/bookmarks/random`

**Auth:** Bearer API key (pro required)

**Algorithm (current Prisma implementation):**
1. Find all `bookmarkOpen` rows for this user (distinct `bookmarkId`) → `excludeIds`.
2. Count bookmarks where `{ userId, status: "READY", id: { notIn: excludeIds } }` → `totalAvailable`.
3. If `totalAvailable === 0` → 404.
4. Pick one with `skip: Math.floor(Math.random() * totalAvailable)`.
5. Create a `bookmarkOpen` record for that bookmark.
6. Return the bookmark with its tags.

**Response body (200):**
```json
{
  "success": true,
  "bookmark": {
    "id": "string",
    "url": "string",
    "title": "string|null",
    "summary": "string|null",
    "type": "BookmarkType|null",
    "status": "BookmarkStatus",
    "starred": "boolean",
    "read": "boolean",
    "preview": "string|null",
    "faviconUrl": "string|null",
    "ogImageUrl": "string|null",
    "ogDescription": "string|null",
    "createdAt": "string (ISO)",
    "tags": ["string"]
  },
  "remaining": "number"
}
```

**Response body (404 — all bookmarks opened):**
```json
{
  "success": false,
  "error": "No more bookmarks available. All bookmarks have been opened.",
  "totalOpened": "number"
}
```

The SDK catches a 404 and returns `{ bookmark: null, remaining: 0, exhausted: true }`.

---

### 3.5 `GET /api/v1/tags`

**Auth:** Bearer API key (pro required)

**Query params:**
| Param | Validation | Default |
|-------|-----------|---------|
| `limit` | `z.coerce.number().min(1).max(100)` | `20` |
| `cursor` | string (tag id for cursor pagination) | — |

Pagination is cursor-based keyed on `tag.id` ascending (`id: { gt: cursor }`).

**Response body (200):**
```json
{
  "success": true,
  "tags": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "bookmarkCount": "number"
    }
  ],
  "hasMore": "boolean",
  "nextCursor": "string|null"
}
```

The implementation fetches `limit + 1` rows; if length > limit, sets `hasMore = true` and slices to `limit`. `nextCursor` is the `id` of the last included tag.

---

### 3.6 `GET /api/v1/public/:slug/bookmarks`

**Auth:** None (unauthenticated / public)

**Gate:** `user.publicLinkEnabled === true` (find user by `publicLinkSlug = params.slug`). If not found or disabled → `404`.

**Query params:**
| Param | Validation |
|-------|-----------|
| `query` | string |
| `tags` | comma-separated strings |
| `types` | comma-separated `BookmarkType`, invalid values silently dropped |
| `limit` | `Number(...)` coerced, default `20` (no explicit min/max validation in current code — add Zod validation per Phase 17 B5) |
| `cursor` | string |

**Fixed search parameter:** `matchingDistance` hardcoded to `0.3`; `specialFilters: []` (no special filters for public view).

**Response body (200):**
```json
{
  "success": true,
  "user": {
    "name": "string",
    "image": "string|null"
  },
  "bookmarks": [
    {
      "id": "string",
      "url": "string",
      "title": "string|null",
      "summary": "string|null",
      "type": "BookmarkType|null",
      "status": "BookmarkStatus",
      "starred": false,
      "read": false,
      "preview": "string|null",
      "faviconUrl": "string|null",
      "ogImageUrl": "string|null",
      "ogDescription": "string|null",
      "createdAt": "string (ISO)",
      "matchedTags": "string[]",
      "metadata": "Record<string,unknown>|null"
    }
  ],
  "hasMore": "boolean",
  "nextCursor": "string|null"
}
```

**CRITICAL field whitelist (Phase 17 B4):**
- `starred` is **always** `false` (never the real value).
- `read` is **always** `false` (never the real value).
- Fields NOT included: `note`, `userId`, `vectorSummary`, `searchEmbedding`, raw internal `metadata` is passed through as-is (not stripped) — but `userId` is never embedded in bookmark metadata.
- `user` object includes only `name` and `image` — never `id`, `email`, `publicLinkSlug`, `stripeCustomerId`, etc.

---

## 4. Extension endpoints (session-cookie auth)

### 4.1 `GET /api/auth/get-session` (Better Auth native endpoint)

Called by `authClient.getSession()` in `auth-client.ts` of both extensions.

**Auth:** session cookie (`credentials: "include"`, `mode: "cors"`)  
**Response:** Better Auth session shape — `{ data: { user: { id, email, name, ... }, session: {...} } }`

The extension `Session` interface only uses `{ user: { id, email, name? } }`.

After migration, this is served by the Better Auth component at `<CONVEX_SITE_URL>/api/auth/get-session`.

### 4.2 `POST /api/bookmarks` (extension bookmark save)

**Auth:** session cookie (`credentials: "include"`)  
**URL:** `${BASE_URL}/api/bookmarks`  

Request body (JSON):
```json
{
  "url": "string",
  "transcript": "string (optional)",
  "metadata": "any (optional)"
}
```

Response on success:
```json
{ "status": "ok", "bookmark": { "id": "string", ... } }
```

The Chrome extension reads `responseData.bookmark?.id` from this response to get the `bookmarkId` for the subsequent screenshot upload.

**Error detection by the extensions:**
- Message contains `"already exists"` → `errorType: "BOOKMARK_ALREADY_EXISTS"` → show "Bookmark exists" UI state.
- Message contains `"maximum number of bookmarks"` → `errorType: "MAX_BOOKMARKS"` → show upgrade UI.
- HTTP status `401` → `errorType: "AUTH_REQUIRED"`.
- All others → `errorType: "UNKNOWN"` → generic error UI.

### 4.3 `POST /api/bookmarks/:bookmarkId/upload-screenshot`

**Auth:** session cookie (`credentials: "include"`)  
**Content-Type:** `multipart/form-data` with field name `"file"` (PNG blob, named `"screenshot.png"` from `captureVisibleTab`)

**Validation (Phase 17 B3):**
- `MAX_FILE_SIZE = 2 * 1024 * 1024` (2 MB)
- `ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]`

**Upload path in R2/S3:** `users/${userId}/bookmarks/${bookmarkId}/${Date.now()}-${file.name}`

**Response (200):**
```json
{
  "success": true,
  "previewUrl": "string (CDN URL)",
  "bookmark": { ... }
}
```

**Side effect:** `bookmark.preview` is updated in the database to the new CDN URL.

**Ownership check:** `getUserBookmark(params.bookmarkId, user.id)` must confirm the bookmark belongs to the authenticated user before accepting the upload.

---

## 5. SDK contract (must not break)

### `HttpClient` constants

```typescript
export const DEFAULT_BASE_URL = "https://saveit.now/api/v1";
// Env override: SAVEIT_BASE_URL
```

The SDK reads `Authorization: Bearer ${this.apiKey}` and `User-Agent: saveit-sdk/0.1.0`.

**Retry behaviour:** GET-only retries; retries on 429 or ≥500; max 3 retries with delays `[500, 1500, 3500]` ms; honours `Retry-After` header; max total retry delay 60 000 ms; default timeout 30 000 ms.

**Error extraction from response body:**
1. `body.error` (string) — primary
2. `body.error.message` (string) — if error is an object
3. `body.message` (string) — fallback

**Error code extraction:**
1. `body.error.code` (string)
2. `body.code` (string)

So error responses must follow `{ "error": "string message", "success": false }` or `{ "error": { "message": "...", "code": "..." } }`.

### CLI token storage

Token path: `~/.config/tokens/saveit.txt` (mode 0o600).  
Env var: `SAVEIT_API_KEY`.  
Base URL override: `SAVEIT_BASE_URL`.  
The CLI's `auth test` command hits `GET /api/v1/tags?limit=1` to verify connectivity.

---

## 6. CORS / allowed origins (current: `apps/web/src/lib/cors.ts`)

```typescript
export const allowedOrigins = [
  "saveit://*",
  "saveit://",
  "http://localhost:8081", "http://localhost:8081/*",
  "http://localhost:3000", ..., "http://localhost:3003/*",
  "http://localhost:*",
  "http://127.0.0.1:*",
  "https://saveit.now", "https://saveit.now/*",
  "https://*.saveit.now",
  "https://saveit-now-web-codelynx.vercel.app",
  "https://saveit-now-web-git-main-codelynx.vercel.app",
  "https://saveit-now-*",
];
```

`Access-Control-Allow-Credentials: true` is set only when origin matches. CORS headers include:
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Max-Age: 86400`

In Convex this maps to `BETTER_AUTH_TRUSTED_ORIGINS` (for auth routes) and explicit CORS headers in httpAction handlers for `/api/v1/*`.

The extension manifests currently declare `host_permissions: ["https://saveit.now/*"]` (Chrome MV3) and `permissions: ["https://saveit.now/*"]` (Firefox MV2). After migration, if the Convex site URL is different, these must be updated.

---

## 7. YouTube transcript extraction (content.ts)

The content script attempts transcript extraction via four methods in order:

1. **`xhr-interception`** — injects `intercept.js` (web-accessible resource) into page context; script postMessages `TRANSCRIPT_EXTRACTED` back; 10-second timeout.
2. **`page`** — parses `ytInitialPlayerResponse` from inline `<script>` tags; follows `captionTracks[].baseUrl` to fetch XML, parses `<text start dur>` nodes with timestamps.
3. **`api`** — fetches `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`; parses `events[].segs[].utf8`.
4. **`captions`** — reads `.ytp-caption-segment`, `.captions-text`, `.caption-line-time` DOM elements.

Success threshold: `transcript.length > 50`.

Transcript format: each segment formatted as `[MM:SS] text\n`.

The resulting `transcript` and `metadata` (with `youtubeTranscript.source/videoId/extractedAt`) are passed to `saveBookmark(url, transcript, metadata)`.

**Screenshot skip conditions:** YouTube videos, Twitter/X.com URLs, image URLs (by extension or image hosting domain), or when saving via "Save this image" context menu.

---

## 8. Target Convex files and function signatures

All handlers go into `packages/backend/convex/http.ts` (httpAction router). Helper and builder files live in the following paths.

### 8.1 `convex/apiKeys/actions.ts`

**Must add `"use node"` if calling Node APIs; otherwise no directive needed.**

```
internal validateApiKey(token: string): Promise<{ user: { id: string }, apiKey: { id: string, name: string } } | null>
```

Implementation:
1. Call `auth.api.verifyApiKey({ body: { key: token } })` via `authComponent`.
2. Check `result.valid` and `result.key`.
3. Resolve user from the betterAuth internal data layer.
4. Check plan: `limits.apiAccess === 0` → throw `throwForbidden("Pro plan required")`.
5. Return `{ user: { id }, apiKey: { id, name } }`.
6. Cache the resolved user per request to avoid double calls (pass result down, do not re-validate).

### 8.2 `convex/functions.ts` — `apiKeyAction` builder

The builder:
1. Reads `Authorization` header from the HTTP action's `Request`.
2. Calls `validateApiKey(token)`.
3. On failure: returns `Response.json({ error: "...", success: false }, { status: 401/403 })`.
4. Injects `{ user, apiKey: { id, name } }` into the action context.

This matches Phase 17 B8: `apiKey.name` must be available in context for audit.

### 8.3 HTTP router routes in `convex/http.ts`

```
GET    /api/v1/bookmarks            → internal action → bookmarks.queries.list (with DTO)
POST   /api/v1/bookmarks            → internal action → bookmarks.mutations.create
DELETE /api/v1/bookmarks/:id        → internal action → bookmarks.mutations.remove
GET    /api/v1/bookmarks/random     → internal action → new bookmarks.queries.random (+ bookmarkOpens.mutations.create)
GET    /api/v1/tags                 → internal action → tags.queries.list
POST   /api/bookmarks               → session-cookie internal action → bookmarks.mutations.create (extension endpoint)
POST   /api/bookmarks/:id/upload-screenshot → session-cookie internal action → files/actions.uploadBookmarkScreenshot
```

For each `/api/v1/*` route:
- Parse + Zod-validate query/body before calling internal functions (Phase 17 B5).
- Use `apiKeyAction` builder for authentication.
- Return JSON exactly matching the shapes in Section 3 above.

For `/api/bookmarks` and `/api/bookmarks/:id/upload-screenshot`:
- Use `authAction` (session cookie) for authentication.
- Return shapes matching Section 4 above.

### 8.4 Public slug endpoint

```
GET /api/v1/public/:slug/bookmarks  → no-auth httpAction
```

Steps:
1. Look up user by `publicLinkSlug` where `publicLinkEnabled === true`.
2. If not found → `404 { error: "Public page not found", success: false }`.
3. Validate `types` against `BookmarkType` union (strip invalids silently).
4. Call `cachedAdvancedSearch` equivalent (Convex search action) with `matchingDistance: 0.3`, `specialFilters: []`.
5. Return the field-whitelisted response (Section 3.6) — **force `starred: false, read: false`**; exclude `note`, `userId`, `vectorSummary`, `searchEmbedding`.

### 8.5 Rate limiting (Phase 17 B6)

Option chosen for implementation: `@convex-dev/rate-limiter` keyed by the key's `referenceId` (userId). Apply at the httpAction handler level before calling the internal function. Suggested limit: align with real production usage before setting hard limits.

---

## 9. Validation rules (Phase 17 B5 — exhaustive)

| Endpoint | Field | Validation |
|----------|-------|-----------|
| `GET /api/v1/bookmarks` | `limit` | `z.coerce.number().min(1).max(100).default(20)` |
| `GET /api/v1/bookmarks` | `matchingDistance` | `z.coerce.number().min(0.1).max(2).default(0.3)` |
| `GET /api/v1/bookmarks` | `types` | split by comma, filter against `BookmarkType` union |
| `GET /api/v1/bookmarks` | `special` | `z.enum(["READ","UNREAD","STAR"]).optional()` |
| `POST /api/v1/bookmarks` | `url` | required string, valid `new URL(url)` |
| `POST /api/v1/bookmarks` | `image` (multipart) | size ≤ `2 * 1024 * 1024`, MIME in `["image/jpeg","image/jpg","image/png","image/webp","image/gif"]` |
| `DELETE /api/v1/bookmarks/:id` | `:id` | string, non-empty |
| `GET /api/v1/tags` | `limit` | `z.coerce.number().min(1).max(100).default(20)` |
| `GET /api/v1/tags` | `cursor` | string, optional |
| `GET /api/v1/public/:slug/bookmarks` | `limit` | `z.coerce.number().min(1).max(100).default(20)` (currently unchecked — add) |
| `POST /api/bookmarks/:id/upload-screenshot` | file | `MAX_FILE_SIZE = 2 * 1024 * 1024`; MIME in `ALLOWED_IMAGE_TYPES` |

---

## 10. Security / ownership checks

| Check | Current guard | Convex equivalent |
|-------|--------------|-------------------|
| API key validity | `auth.api.verifyApiKey` | same via `authComponent` |
| Pro plan gate for all `/api/v1/*` | `limits.apiAccess === 0` → 403 | `apiKeyAction` builder |
| Ownership before delete | `deleteBookmark({ id, userId })` — db query with both fields | `bookmarks.mutations.remove` with `authMutation` |
| Ownership before screenshot upload | `getUserBookmark(bookmarkId, userId)` before accepting file | must be done inside the action before writing to R2 |
| Public slug gate | `publicLinkEnabled === true` — db query | query user by `publicLinkSlug` field in BA user table |
| Public DTO field strip | explicit field list in response; `starred: false, read: false` | must be hardcoded in the httpAction response mapper |
| Custom limits override | `metadata.customLimits` parsed by `parseCustomAuthLimits` | replicate in `billing/plans.ts` `getLimit()` helpers |
| File size + MIME | checked before upload to R2 | must check before calling `files/actions.uploadToR2` |

---

## 11. Edge cases and gotchas

1. **`GET /api/v1/bookmarks/random` race condition:** The current implementation does `COUNT` then `skip: random * total` then `CREATE bookmarkOpen` non-atomically. In Convex this must be done as a **single mutation** (read + write in one transaction) to be safe — but computing a random index on a Convex-indexed set is not straightforward. Option: keep list of bookmark IDs, pick random index in an action, then delegate the `bookmarkOpen` insert to a mutation. Or: store `bookmarkOpen` and use a two-step approach since Convex mutations are serialized (no TOCTOU for a single user).

2. **`DELETE /api/v1/bookmarks/:id` response:** Returns `{ success: true, bookmark: { id } }` — only `id`, not the full bookmark object. The `deleteBookmark` function returns the deleted record; map to `{ id }`.

3. **Extension `saveBookmark` returns `bookmarkId`:** The Chrome extension reads `responseData.bookmark?.id` for the subsequent `uploadScreenshot` call. The Firefox extension's `saveBookmark` does not expose `bookmarkId` in its return type (different version) — but the POST `/api/bookmarks` response must include `bookmark.id` in all cases. The `{ status: "ok", bookmark: { id, ... } }` shape from `api.bookmarks.ts` satisfies this.

4. **SDK base URL hardcoded:** `DEFAULT_BASE_URL = "https://saveit.now/api/v1"`. During migration, either (a) proxy `saveit.now/api/v1/*` to the Convex site URL, or (b) release an SDK update with the new URL. Option (a) avoids a breaking change for existing SDK users. The CLI honours `SAVEIT_BASE_URL` env override.

5. **Extension `better-auth/client` base URL:** Both Chrome and Firefox `auth-client.ts` use `config.BASE_URL` (injected at build time as `__BASE_URL__`). After migration the Better Auth endpoint moves to the Convex site URL (`.convex.site`). The `baseURL` in `createAuthClient` must point to the site where Better Auth's `/api/auth/*` routes are served. If the TanStack web app still proxies `/api/auth/*` to the Convex site URL, no extension change is needed.

6. **CORS for extensions:** Better Auth `trustedOrigins` (Phase 02) must include `chrome-extension://*` and `moz-extension://*`. The Firefox manifest MV2 `host_permissions` is embedded in the `permissions` array. After migration to the new Convex origin, the manifests' `host_permissions` must be updated to include the Convex site domain.

7. **Multipart form parse in httpAction:** Convex httpActions receive a standard `Request`. `request.formData()` works natively. No special handling needed, but the multipart path in `parseBookmarkBody` (image upload → R2 → replace URL) must be replicated in the Convex action.

8. **`BookmarkValidationError` error messages:** The extension content script detects `"already exists"` and `"maximum number of bookmarks"` by substring match on `errorData.error`. These exact strings must be preserved in the Convex error messages for backward compatibility.

9. **YouTube transcript metadata shape:** The `metadata` passed with YouTube saves contains:
   ```json
   {
     "youtubeTranscript": {
       "source": "xhr-interception|page|api|captions",
       "videoId": "string",
       "extractedAt": "ISO string"
     }
   }
   ```
   This is stored as-is on the bookmark and processed by the pipeline.

10. **Screenshot conditions:** The extension does NOT upload a screenshot for YouTube, Twitter/X.com, image URLs, or when saving via "Save this image" context menu. The upload endpoint must still accept screenshots from other pages.

11. **CORS headers for `/api/v1/*`:** These are httpActions, not Better Auth routes. CORS must be handled explicitly in the httpAction handler (not by `registerRoutes({ cors: true })`). Add `OPTIONS` preflight handlers for each route, setting the same headers as the current `cors.ts` `updateHeaders()` function.

12. **Firefox does not have screenshot upload:** `apps/firefox-extension/src/background.ts` has no `CAPTURE_SCREENSHOT` or `UPLOAD_SCREENSHOT` message handlers. The `/api/bookmarks/:id/upload-screenshot` endpoint is only used by the Chrome extension.

13. **`"use node"` directive:** Any file calling `auth.api.verifyApiKey` or the Better Auth adapter needs to run in Node context if it uses Node-specific APIs. `apiKeys/actions.ts` should declare `"use node"` if it imports from packages requiring Node (e.g. Resend, crypto). If pure Convex calls suffice, no directive is needed.

14. **Tag `POST` endpoint missing from current v1 routes:** The current `api.v1.tags.ts` only has `GET`. The Phase 12 plan shows `POST /api/v1/tags` in the target Convex router. Verify whether this endpoint is needed for SDK/CLI users before adding it.

15. **`updatedAt` in POST /api/v1/bookmarks response:** The `POST` response includes `updatedAt` (ISO string) which is the Prisma model's `updatedAt` field. Convex's equivalent is `_creationTime` for creation; the schema must include an explicit `updatedAt` field on the bookmarks table (or use `_creationTime` mapped to `createdAt`).
