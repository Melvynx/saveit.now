# Spec 12 — Misc, Security, Env-Vars, Middleware Parity

**Covers:** `apps/web/src/lib/{env,errors,cors,safe-route}.ts` + all remaining API routes not captured in earlier specs. Maps to Phase 17 (security checklist) and leftover routes.

---

## 1. Source Files and Their Exact Responsibilities

### 1.1 `apps/web/src/lib/env.ts`
Zod-validated server-only environment schema. Parsed with `EnvSchema.parse(process.env)` at module load.

**Server-only (never client bundle) vars defined here:**
| Var | Default / constraint |
|-----|---------------------|
| `AWS_ACCESS_KEY_ID` | `.min(1)`, default `"ci-placeholder"` |
| `AWS_SECRET_ACCESS_KEY` | `.min(1)`, default `"ci-placeholder"` |
| `AWS_S3_BUCKET_NAME` | `.min(1)`, default `"ci-placeholder"` |
| `AWS_ENDPOINT` | `.min(1)`, default `"https://ci-placeholder.com"` |
| `R2_URL` | `.min(1)`, default `"https://ci-placeholder.com"` |
| `CLOUDFLARE_API_TOKEN` | `.min(1)`, default `"ci-placeholder"` |
| `CLOUDFLARE_ACCOUNT_ID` | `.min(1)`, default `"ci-placeholder"` |
| `NODE_ENV` | enum `development\|production\|test`, default `"test"` |
| `UPSTASH_REDIS_REST_URL` | `.min(1)`, default `"https://placeholder.upstash.io"` |
| `UPSTASH_REDIS_REST_TOKEN` | `.min(1)`, default `"placeholder-token"` |
| `RESEND_EMAIL_FROM` | default `"Melvyn from SaveIt.now <help@re.saveit.now>"` |
| `HELP_EMAIL` | `.min(1)`, default `"help@saveit.now"` |
| `STRIPE_COUPON_ID` | `.min(1)`, default `"ci-placeholder"` |
| `RESEND_API_KEY` | `.min(1)`, default `"re_placeholder_for_ci"` |
| `CI` | `z.coerce.boolean().optional().default(false)` |

**Client-visible (`VITE_*`) vars** (from `turbo.json`, not in env.ts, bundled to browser):
- `VITE_POSTHOG_HOST`, `VITE_POSTHOG_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_ENABLE_VIRTUALIZATION`
- `VITE_CONVEX_URL` (added during migration)

**Notable absences from env.ts** (managed elsewhere or via BA):
- `BETTER_AUTH_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — referenced by the auth/Prisma/Stripe layers but not in this Zod file.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — in auth config, not here.

### 1.2 `apps/web/src/lib/errors.ts`
Error class hierarchy:
- `ApplicationError extends Error` — base, has `.type: string`
- `SafeActionError extends ApplicationError` — type `"SafeActionError"`
- `SafeRouteError extends ApplicationError` — type `"SafeRouteError"`, has `.status: number` (default `400`)
- `BookmarkErrorType = { MAX_BOOKMARKS: "MAX_BOOKMARKS", BOOKMARK_ALREADY_EXISTS: "BOOKMARK_ALREADY_EXISTS" }` — domain error constants

### 1.3 `apps/web/src/lib/cors.ts`
CORS origin allowlist and response-header helper.

**`allowedOrigins` array (exact values, order matters for prefix matching):**
```
"saveit://*", "saveit://"
"http://localhost:8081", "http://localhost:8081/*"
"http://localhost:3000", "http://localhost:3000/*"
"http://localhost:3001", "http://localhost:3001/*"
"http://localhost:3002", "http://localhost:3002/*"
"http://localhost:3003", "http://localhost:3003/*"
"http://localhost:*", "http://127.0.0.1:*"
"https://saveit.now", "https://saveit.now/*"
"https://*.saveit.now"
"https://saveit-now-web-codelynx.vercel.app"
"https://saveit-now-web-git-main-codelynx.vercel.app"
"https://saveit-now-*"
```

**`updateHeaders(headers, request)`** logic:
1. Sets `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
2. Sets `Access-Control-Allow-Headers: Content-Type, Authorization`
3. Sets `Access-Control-Max-Age: 86400`
4. Pattern-matches the `Origin` header: if the pattern ends with `*`, checks `origin.startsWith(pattern.slice(0,-1))`; else exact match
5. On match: sets `Access-Control-Allow-Origin: <origin>` and `Access-Control-Allow-Credentials: true`
6. Extensions (`chrome-extension://`, `moz-extension://`) are NOT in this list — they must be added to Convex `trustedOrigins` (Phase 17 B9)

### 1.4 `apps/web/src/lib/safe-route.ts`
The central route-builder and auth-guard layer for all TanStack API routes.

**`jsonError(error)`** — converts errors to JSON responses:
- `SafeRouteError` → `{ error: message }` with `error.status`
- `ApplicationError` → `{ error: message }` status 400
- `ZodError` → `{ error: "Invalid query", message: "Invalid query", errors: error.issues, issues: error.issues }` status 400
- Unknown → `{ error: "An unexpected error occurred" }` status 500, also `console.error`s

**`deduplicateCookies(headers)`** — parses `cookie` header, keeps LAST occurrence of each key (using `Map` so last write wins). This handles a real bug where duplicate cookies from different Set-Cookie paths caused auth failures.

**`getSessionFromRequest(request)`** — calls `auth.api.getSession({ headers: deduplicateCookies(request.headers) })`, returns `session?.user ?? null`.

**`requireUser(request)`** — if no session, logs warning (with cookieKeys, userAgent), returns `Response.json({ error: "Unauthorized" }, { status: 403 })`.

**`requireAdmin(request)`** — requires session AND `user.role === "admin"`, else 403.

**`requireApiKey(request)`** — delegates to `validateApiKey(request)` (see 1.x below), returns `{ user, apiKey }` or a 401/403 JSON Response.

**`StandardRouteBuilder<TParams, TQuery, TBody, TContext>`** — fluent builder:
- `.params(schema)` → validates `params` object with Zod
- `.query(schema)` → validates URL search params via `parseQuery`
- `.body(schema)` → validates request body via `parseBody`
- `.handler(fn)` → returns the actual `async ({ request, params }) => Response` handler; wraps all in `try/catch → jsonError`

**`parseBody(request)`** — `multipart/form-data` → `Object.fromEntries(formData())`; `application/json` → `request.json()`; else tries `JSON.parse(text)` or returns raw text.

**`parseQuery(request)`** — returns `Record<string, string | string[]>`, multi-value keys become arrays.

**Exported route builders:**
- `routeClient` — no auth context
- `userRoute` — injects `{ user }` (requires cookie session)
- `adminRoute` — injects `{ user }` (requires admin role)
- `apiRoute` — injects `{ user, apiKey }` (requires Bearer API key)

### 1.5 `apps/web/src/lib/auth/api-key-auth.ts`
**`validateApiKey(request)`** — returns discriminated union `{ success: true, user: {id}, apiKey: {id, name} }` or `{ success: false, error, status }`.

Logic:
1. Extract `Authorization` header; missing → `{ error: "Missing authorization header", status: 401, success: false }`
2. Strip `"Bearer "` prefix; empty → `{ error: "Invalid authorization header format", status: 401 }`
3. Call `auth.api.verifyApiKey({ body: { key: token } })`
4. `result.valid === false` → 401 `"Invalid API key"`
5. `result.key` absent → 401 `"API key not found"`
6. Fetch `prisma.user.findUnique` by `result.key.userId` for `metadata` + `subscriptions` (status in `["active","trialing"]`)
7. Compute `getAuthLimits({ plan: currentPlan }, metadata)`
8. `limits.apiAccess === 0` → 403 `"Pro plan required"`
9. Return `{ user: { id: result.key.userId }, apiKey: { id: result.key.id, name: result.key.name || "" }, success: true }`

### 1.6 `apps/web/src/lib/auth-limits.ts`
Plan limits and custom-limits parsing.

**`AuthLimits` shape:** `{ bookmarks, monthlyBookmarkRuns, monthlyChatQueries, canExport, apiAccess }` — all `number`.

**`AUTH_LIMITS` constants (MUST preserve exactly):**
```ts
free:  { bookmarks: 20, monthlyBookmarkRuns: 20,   monthlyChatQueries: 10,  canExport: 0, apiAccess: 0 }
pro:   { bookmarks: 50000, monthlyBookmarkRuns: 1500, monthlyChatQueries: 200, canExport: 1, apiAccess: 1 }
```

**`parseCustomAuthLimits(metadata)`** — extracts `metadata.customLimits` object; for each of the 5 `AUTH_LIMIT_KEYS`, accepts only `typeof value === "number" && isFinite && isInteger && >= 0`. Invalid keys are silently skipped.

**`getAuthLimits(subscription, metadata)`** — returns `{ ...AUTH_LIMITS[plan ?? "free"], ...parseCustomAuthLimits(metadata) }`. Merges custom overrides on top of plan defaults.

### 1.7 `apps/web/src/lib/auth-session.ts`
Server-side session helpers (used in route loaders, not API routes):
- `getUser()` — `auth.api.getSession({ headers: getRequestHeaders() })` → `session?.user`
- `getRequiredUser()` — throws `Response("Unauthorized", 401)` if no user
- `getRequiredUserOrRedirect()` — throws `redirect({ to: "/signin" })`
- `getUserLimits()` — fetches subscription + metadata, returns user + limits + customLimits + plan
- `getUserLimitsOrRedirect()` — same but redirects if not authed

### 1.8 `apps/web/src/lib/changelog/changelog-redis.ts`
Redis-backed changelog dismissal:
- `markChangelogAsDismissed(userId, version)` → `redis.set("user:{userId}:dismissed_changelog:{version}", "true")`
- `isChangelogDismissed(userId, version)` → `redis.get(...)` → `Boolean(result)`

### 1.9 `apps/web/src/lib/tools/tool-route-utils.ts`
Shared utilities for all `/api/tools/*` routes:

**`TOOL_USER_AGENT`** (verbatim — servers block default Node UA):
```
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
```

**`resolveUrl(baseUrl: URL, value: string | undefined)`**:
- `undefined` → `undefined`
- starts with `"http"` → return as-is
- starts with `"//"` → prepend `baseUrl.protocol`
- else → `new URL(value, baseUrl.origin).href`
- any exception → `undefined`

**`fetchHtml(url: string)`** — GET with `TOOL_USER_AGENT`, throws `"Failed to fetch the webpage"` if `!response.ok`.

**`captureToolUsage(request, toolName)`** — fires PostHog event `ANALYTICS.TOOL_USED` with `tool_name`. Uses `x-forwarded-for` || `x-real-ip` || `"unknown"` as `distinctId` base (hashed with `getPosthogId`). Silently swallows errors.

**`toolErrorResponse(error)`**:
- `ZodError` → `{ error: "VALIDATION_ERROR", issues: [{field, message}] }` status 400
- Other → `{ error: error.message || "Tool request failed" }` status 400

---

## 2. API Routes — Business Logic, Algorithms, Security Guards

### 2.1 `PATCH /api/user/profile`
**Auth:** cookie session required (`requireUser`).
**Body schema:** `{ name?: string (min 1), email?: string (email) }`
**Logic:**
- If `name` present: `auth.api.updateUser({ headers, body: { name } })`
- If `email` present: validate with `EmailChangeSchema` (min 1, email, max 255), then `auth.api.changeEmail({ headers, body: { newEmail, callbackURL: "/account" } })`
- Returns `{ success: true }`
**Security gates:** user must be authenticated; both operations go through Better Auth's own validation.

### 2.2 `POST /api/user/avatar`
**Auth:** cookie session required.
**Body:** `multipart/form-data` with field `"file"` as `File`.
**Guards (Phase 17 B3 — MUST preserve):**
```ts
const MAX_FILE_SIZE = 2 * 1024 * 1024;  // 2MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
```
- `!(file instanceof File)` → 400 `"No file provided"`
- `file.size > MAX_FILE_SIZE` → 400 `"File size must be less than 2MB"`
- `!ALLOWED_IMAGE_TYPES.includes(file.type)` → 400 `"Only image files (JPEG, PNG, WebP, GIF) are allowed"`
**Upload path:** `users/${user.id}/avatar/${Date.now()}-avatar.${ext}` via `uploadFileToS3`.
**After upload:** `prisma.user.update({ where: { id: user.id }, data: { image: avatarUrl } })`
**Returns:** `{ success: true, avatarUrl: string }`

### 2.3 `GET /api/user/limits`
**Auth:** cookie session required.
**Logic:**
1. Fetch active/trialing subscription for `user.id`
2. Fetch `getUserMetadata(user.id)`
3. Compute `getAuthLimits(subscription, metadata)`
4. Return:
```json
{
  "plan": "free" | "pro",
  "limits": { "bookmarks": N, "monthlyBookmarkRuns": N, "monthlyChatQueries": N, "canExport": 0|1, "apiAccess": 0|1 },
  "customLimits": { /* partial AuthLimits, only overridden fields */ },
  "subscription": null | { "id": "...", "status": "active"|"trialing", "periodEnd": ... }
}
```

### 2.4 `PATCH /api/user/public-link`
**Auth:** cookie session required.
**Body schema:**
```ts
z.object({
  enabled: z.boolean(),
  slug: z.string().min(3).max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional().nullable()
})
```
**Validation logic:**
1. `enabled && !slug` → 400 `"Slug is required when enabling public link"`
2. `enabled && slug` → check `prisma.user.findUnique({ where: { publicLinkSlug: slug }, select: { id: true } })`; if found and `id !== user.id` → 400 `"This slug is already taken"`
3. Update: `prisma.user.update({ where: { id: user.id }, data: { publicLinkEnabled: enabled, publicLinkSlug: enabled ? slug : null } })`
**Returns:** `{ success: true }`
**Security:** uniqueness check is owner-safe (same user can update their own slug without conflict).

### 2.5 `POST /api/bug-report`
**Auth:** cookie session required (`userRoute`).
**Body schema:**
```ts
z.object({
  description: z.string().min(10, "Bug description must be at least 10 characters"),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional()
})
```
**Logic:** Sends HTML email to `"help@saveit.now"` via `sendEmail`:
- `to: "help@saveit.now"`
- `subject: "Bug Report from ${ctx.user.email}"`
- `replyTo: ctx.user.email`
- HTML includes: user.email, user.id, description (`.replace(/\n/g, "<br>")`), optional deviceInfo, optional appVersion, `new Date().toISOString()`
**Returns:** `{ success: true, message: "Bug report sent successfully" }` or 500 on failure.

### 2.6 `GET /api/og/bookmark/$bookmarkId`
**Auth:** NONE — fully public.
**No ownership check.** Any `bookmarkId` can generate an OG image.
**Logic:**
1. `prisma.bookmark.findUnique` selecting: `title, url, summary, ogDescription, type, tags(take:5){ tag { name } }`
2. Derives `domain` from `new URL(bookmark.url).hostname.replace("www.", "")` (fallback: raw url)
3. `title = escapeXml(truncate(bookmark.title || domain, 70))`
4. `description = escapeXml(truncate(bookmark.summary || bookmark.ogDescription || "", 150))`
5. Takes up to 4 tags
6. Returns hand-crafted SVG 1200×630 as `image/svg+xml`

**SVG layout (exact colors):**
- Background: `#0a0a0a`
- Brand text "SaveIt.now" at (60,88) in `#a78bfa`, 28px bold
- Type badge at x=980,y=58, fill `#1f2937`, text `#d1d5db`
- Title at (60,195) in `#f9fafb`, 52px bold
- Description at (60,275) in `#9ca3af`, 24px
- Tags at y=530, spaced 150px each: rect fill `#1f2937` stroke `#374151`, text `#d1d5db`; truncated to 14 chars
- Domain at (1140,554) `text-anchor="end"` `#6b7280`

**`escapeXml`:** `&→&amp;`, `<→&lt;`, `>→&gt;`, `"→&quot;`
**`truncate(value, len)`:** if `value.length > len` → `value.slice(0, len-3) + "..."`

### 2.7 `GET /api/b` (quick-save redirect)
**Auth:** cookie session required.
**Query schema:** `{ url: z.string().url() }`
**Logic:** Calls `createBookmark({ url, userId: ctx.user.id })`, then `Response.redirect(new URL("/app", request.url))`
**Note:** This is the browser bookmarklet endpoint. Limit checking happens inside `createBookmark`.

### 2.8 `POST /api/start` (onboarding)
**Auth:** cookie session required (inline `requireUser`).
**Logic:** `prisma.user.update({ where: { id: user.id }, data: { onboarding: true } })`
**Returns:** `{ success: true }`

### 2.9 `POST /api/exports`
**Auth:** cookie session required.
**Plan gate (`canExport`):**
1. Fetch subscription + metadata
2. `getAuthLimits(subscription, metadata)`
3. `limits.canExport === 0` → 400 `"You have reached the maximum number of exports"`
**Data fetched:**
```ts
prisma.bookmark.findMany({
  where: { userId: user.id },
  select: { title, ogDescription, summary, type, url },
  orderBy: { createdAt: "desc" }
})
```
**CSV format (exact header):**
```
title,description,summary,type,url\n
```
Each row: 5 fields escaped with `escapeCsvField` (wraps in `"..."` and doubles internal quotes if field contains `,`, `\n`, or `"`).
**Returns:**
```json
{ "csvContent": "title,...\n...", "totalBookmarks": N }
```

### 2.10 `POST /api/imports`
**Auth:** cookie session required.
**Body schema:** `{ text: z.string() }`
**URL extraction:** matches with regex:
```
/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g
```
Deduplicates with `[...new Set(urls)]`.

**Limit check:**
1. `getUserLimits()` → get `limits.bookmarks`
2. Count existing: `prisma.bookmark.count({ where: { userId: user.id } })`
3. `availableSlots = limits.bookmarks - currentBookmarkCount`
4. `availableSlots <= 0` → 400 with error message about limit

**Processing:**
- `urlsToProcess = uniqueUrls.slice(0, availableSlots)` — respects limit
- `skippedUrls = uniqueUrls.slice(availableSlots)`
- Loops serially, calls `createBookmark({ url, userId })` for each
- Breaks on `errorMessage.includes("maximum number of bookmarks")`
- Collects `ImportResult[]` with `{ url, success, error?, bookmark? }`

**Returns:**
```json
{
  "totalUrls": N,
  "processedUrls": N,
  "skippedUrls": N,
  "createdBookmarks": N,
  "failedBookmarks": N,
  "availableSlots": N,
  "results": [...],
  "hasMoreUrls": boolean,
  "limitReached": boolean
}
```

### 2.11 `POST /api/changelog/dismiss`
**Auth:** cookie session required.
**Body:** `{ version: z.string().min(1) }`
**Logic:** `redis.set("user:{user.id}:dismissed_changelog:{version}", "true")`
**Returns:** `{ success: true }`

### 2.12 `POST /api/changelog/check-dismissed`
**Auth:** cookie session required.
**Body:** `{ version: z.string().min(1) }`
**Logic:** `redis.get("user:{user.id}:dismissed_changelog:{version}")` → `{ isDismissed: boolean }`

### 2.13 `POST /api/tools/extract-content` (public — no auth)
**Request:** `{ url: z.string().url("Please provide a valid URL") }`
**Algorithm:**
1. `fetchHtml(url)` with `TOOL_USER_AGENT`
2. Cheerio load; remove `script, style, link, meta, noscript, iframe, svg`
3. Article selection priority: `article` > `main` > `[role='main']` > `.content,.post-content,.entry-content,.article-content` > `body`
4. TurndownService config: `{ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" }` → markdown
5. Plain text: also removes `nav, header, footer, aside`; `$.text().replace(/\s+/g, " ").trim()`
6. Word count: `plainText.split(/\s+/).filter(word => word.length > 0).length`
7. Reading time: `Math.ceil(wordCount / 225)` — magic constant 225 wpm
8. Paragraph count: splits on `/\n\s*\n|\.\s+(?=[A-Z])/`, filters `paragraph.trim().length > 10`
9. Title priority: `og:title` > `twitter:title` > `h1.first()` > `title` > `baseUrl.hostname`
10. Favicon priority: `link[rel='icon'][sizes='32x32']` > `link[rel='shortcut icon']` > `link[rel='icon']` > `link[rel='apple-touch-icon']`; fallback `${baseUrl.origin}/favicon.ico`
11. PostHog event: `captureToolUsage(request, "extract-content")` — fires even on error

**Response shape (`ExtractContentResponse`):**
```json
{
  "url": "...",
  "content": { "title": "...", "plainText": "...", "markdown": "...", "statistics": { "wordCount": N, "charCount": N, "paragraphCount": N, "readingTime": N } },
  "metadata": { "title": "...", "description": "...", "siteName": "...", "author": "...", "publishedDate": "...", "faviconUrl": "...", "ogImageUrl": "..." }
}
```

### 2.14 `POST /api/tools/extract-metadata` (public — no auth)
**Request:** `{ url: z.string().url() }`
**Logic:** Full meta-tag extraction via Cheerio: standard, OpenGraph, Twitter cards, technical meta, page analysis.

**Page analysis** (`pageAnalysis` field):
- `wordCount`: `$("body").text().trim().split(/\s+/).filter(Boolean).length`
- Internal link count: resolved href with same hostname as baseUrl
- All 6 heading counts h1-h6
- `hasAltText`: count of `img[alt]`; `missingAltText`: total images - hasAltText

**Response shape (`ExtractMetadataResponse`):**
```json
{
  "url": "...",
  "metadata": {
    "standard": { title, description, keywords, author, generator, language, revisitAfter, rating, copyright, distribution, classification },
    "openGraph": { title, description, type, url, siteName, image: {url,alt,width,height,type}, video, audio, locale, localeAlternate, determiner },
    "twitter": { card, site, creator, title, description, image: {url,alt}, player: {url,width,height,stream}, app: {name,id,url} × {iphone,ipad,googleplay} },
    "technical": { viewport, charset, httpEquiv, robots, canonical, ampHtml, manifest, themeColor, appleMobileWebAppCapable, appleMobileWebAppStatusBarStyle, appleMobileWebAppTitle, applicationName, msapplicationTileColor, msapplicationTileImage },
    "pageAnalysis": { wordCount, imageCount, linkCount, internalLinkCount, externalLinkCount, headingCount: {h1-h6}, hasAltText, missingAltText }
  },
  "extractedAt": "ISO8601"
}
```

### 2.15 `POST /api/tools/extract-favicons` (public — no auth)
**Request:** `{ url: z.string().url() }`
**`STANDARD_FAVICON_PATHS`** to probe (exact list):
```
["/favicon.ico", "/favicon.png", "/favicon.svg", "/apple-touch-icon.png",
 "/apple-touch-icon-152x152.png", "/apple-touch-icon-180x180.png",
 "/icon-192x192.png", "/icon-512x512.png"]
```
**`FAVICON_FORMATS`:** `["ico","png","svg","jpg","jpeg","gif","webp"]`

**Validation per candidate:** HEAD request with `TOOL_USER_AGENT`; checks `response.ok` and `content-type` starts with `"image/"`.

**Type categorization (`categorizeFaviconType(rel, href)`):**
- `rel` includes `"apple-touch-icon-precomposed"` → `"apple-touch-icon-precomposed"`
- `rel` includes `"apple-touch-icon"` → `"apple-touch-icon"`
- href/rel includes `"android"` → `"android-icon"`
- `rel` includes `"shortcut"` → `"shortcut-icon"`
- `rel === "icon"` → `"icon"`
- href includes `"favicon"` → `"favicon"`
- default → `"icon"`

**Deduplication:** Filter by `favicon.url` (first occurrence only).
**Result summaries:**
- `appleTouchIcon`: largest by width among `type === "apple-touch-icon"` valid items
- `androidIcon`: largest by width among `type === "android-icon"` valid items
- `largestIcon`: sorted by width descending, first valid

**Response shape (`ExtractFaviconsResponse`):**
```json
{
  "url": "...",
  "favicons": [{ url, type, format, size, width, height, fileSize, rel, isValid, errorMessage }],
  "metadata": { title, domain, totalFavicons, validFavicons, standardFavicon, appleTouchIcon, androidIcon, svgIcon, largestIcon }
}
```

### 2.16 `POST /api/tools/og-images` (public — no auth)
**Request:** `{ url: z.string().url() }`
**Logic:** Cheerio scrape; OG + Twitter card extraction; `resolveUrl` for image URLs.
**Response shape (`OGImageResponse`):**
```json
{
  "url": "...",
  "metadata": {
    "openGraph": { title, description, siteName, type (default "website"), image: {url,alt,width,height} },
    "twitter": { card (default "summary"), title, description, site, creator, image: {url,alt} },
    "page": { title, description },
    "images": { ogImage, twitterImage, primary: ogImage ?? twitterImage }
  }
}
```

### 2.17 `POST /api/tools/youtube-metadata` (public — no auth)
**Request:** `{ url: z.string().url("Please provide a valid YouTube URL") }`

**Video ID extraction** — tries 2 regex patterns in order:
```
Pattern 1: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/
Pattern 2: /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
```
Capture group `[1]` is the 11-char video ID.

**No valid ID** → return `{ success: false, error: "Invalid YouTube URL. Please provide a valid YouTube video URL." }`

**Fetch YouTube page:** `GET https://www.youtube.com/watch?v=${videoId}` with headers:
```
"User-Agent": TOOL_USER_AGENT
"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
"Accept-Language": "en-US,en;q=0.5"
"DNT": "1"
```
Non-OK → `{ success: false, error: "Failed to fetch YouTube page: ${status} ${statusText}" }`

**JSON-LD parsing:** `$('script[type="application/ld+json"]').each(...)` → finds `@type === "VideoObject"` → extracts `uploadDate`, `duration` (parsed via ISO8601 parser), `interactionStatistic` for WatchAction `userInteractionCount`.

**ISO8601 duration parser:** `PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?` → `"2h 30m 5s"` (omits zero parts); fallback to original string.

**Thumbnail generation (5 standard qualities):**
```
default: 120×90, mqdefault: 320×180, hqdefault: 480×360, sddefault: 640×480, maxresdefault: 1280×720
URL: https://img.youtube.com/vi/${videoId}/${quality}.jpg
```

**Title cleanup:** if title ends with `" - YouTube"`, strip it.
**Channel ID:** from `link[rel="canonical"]` href matching `/channel/([a-zA-Z0-9_-]+)`.

**Response:**
```json
{
  "success": true,
  "data": { videoId, title, description?, channelTitle?, channelId?, publishedAt?, duration?, viewCount?, thumbnails: [...], url }
}
```
or `{ "success": false, "error": "..." }`

### 2.18 `GET /api/health`
**Auth:** NONE — public health-check.
**Logic:** Measures `prisma.$connect()` latency.
**Response:**
```json
{
  "ok": boolean,
  "msg": "All services healthy" | "Some services are unhealthy",
  "ping": N,
  "services": { "database": { "status": "healthy"|"unhealthy", "latency": N, "error"?: "..." } }
}
```
Status: 200 if all healthy, 503 otherwise.

**Convex replacement:** check `ctx.db` or run a lightweight `ctx.db.query("users").take(1)` instead of Prisma connect. Keep same response shape.

### 2.19 `GET|POST|PUT /api/inngest`
The Inngest webhook receiver. Serves `processBookmarkJob`, `batchMarketingEmailJob`, `marketingEmailsOnLimitReachedJob`, `marketingEmailsOnSubscriptionJob`, `marketingEmailsOnNewSubscriberJob`.
**Convex:** This route is **DELETED** entirely — all jobs move to Convex actions/scheduler (Phase 06/10).

---

## 3. Env Var Mapping to Convex

### 3.1 Complete Turbo.json env var list (authoritative)
These are all vars that affect the build (all phases need to track these):

**Server-side secrets → move to `npx convex env set`:**
```
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
RESEND_API_KEY
OPENAI_API_KEY
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_REGION, AWS_ENDPOINT
BETTER_AUTH_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
GOOGLE_GENERATIVE_AI_API_KEY
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
HELP_EMAIL, RESEND_EMAIL_FROM
STRIPE_COUPON_ID, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID
R2_URL
SCREENSHOT_WORKER_URL (deprecated after migration)
INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY (deprecated after migration)
DATABASE_URL, DATABASE_URL_UNPOOLED (deprecated after migration)
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (deprecated after migration)
```

**Client-side (`VITE_*` — stay in app .env):**
```
VITE_POSTHOG_HOST, VITE_POSTHOG_KEY
VITE_STRIPE_PUBLISHABLE_KEY
VITE_ENABLE_VIRTUALIZATION
VITE_CONVEX_URL  (NEW — added during migration)
```

**Build/CI environment:**
```
NODE_ENV, CI, HEADLESS, NITRO_PRESET
VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL
PLAYWRIGHT_TEST_BASE_URL
PORT (globalEnv)
PLAYWRIGHT_CHROMIUM_CHANNEL (globalEnv)
CONVEX_DEPLOYMENT, CONVEX_URL, CONVEX_SITE_URL, CONVEX_DEPLOY_KEY  (NEW — added during migration)
```

**Mobile (stay in mobile .env):**
```
EXPO_PUBLIC_AUTH_URL (deprecated → EXPO_PUBLIC_CONVEX_SITE_URL)
EXPO_PUBLIC_API_URL  (deprecated → EXPO_PUBLIC_CONVEX_URL)
```

### 3.2 Security classification (Phase 17 B12)
- **NEVER put in VITE_***: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BETTER_AUTH_SECRET`, `*_CLIENT_SECRET`, `CLOUDFLARE_API_TOKEN`, `DATABASE_URL`, `CONVEX_DEPLOY_KEY`
- **Safe as VITE_***: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_POSTHOG_*`, `VITE_CONVEX_URL`, `VITE_ENABLE_VIRTUALIZATION`
- **Set via `npx convex env set`**: all server secrets above

---

## 4. Target Convex File/Function Mapping

### 4.1 `convex/utils/errors.ts` (Phase 17 B1 — NEW)
```ts
// "use convex"; (no "use node")
throwUnauthorized(message?)   // ConvexError<{ code: "UNAUTHORIZED", message }>
throwForbidden(message?)      // ConvexError<{ code: "FORBIDDEN", message }>
throwNotFound(message?)       // ConvexError<{ code: "NOT_FOUND", message }>
throwValidationError(message) // ConvexError<{ code: "VALIDATION_ERROR", message }>
throwLimitReached(message?)   // ConvexError<{ code: "LIMIT_REACHED", message }>
```
Used everywhere auth/ownership/limit checks occur. Must NOT leak internals.

### 4.2 `convex/functions.ts` — builder additions
- `authQuery`, `authMutation`, `authAction` — existing (from Phase 02)
- **ADD** banned-user check (Phase 17 B2): after resolving user, if `user.banned === true` (and `!banExpires || banExpires > Date.now()`), `throwForbidden("Account banned")`
- **ADD** `apiKeyAction` builder (Phase 12): reads `Authorization: Bearer <token>` from HTTP context, calls `validateApiKey`, injects `{ user, apiKey: { id, name } }` (Phase 17 B8)

### 4.3 `convex/users/mutations.ts` (or `auth/mutations.ts`)
```ts
updateProfile: authMutation  // name and/or email change — delegates to BA updateUser/changeEmail
setOnboarding: authMutation  // sets user.onboarding = true (replaces /api/start)
updatePublicLink: authMutation  // validates slug regex + uniqueness check, updates publicLinkEnabled + publicLinkSlug
uploadAvatar: authAction      // "use node" — validates 2MB + MIME, uploads to R2, updates user.image
```

### 4.4 `convex/users/queries.ts`
```ts
getLimits: authQuery  // returns { plan, limits, customLimits, subscription: { id, status, periodEnd } | null }
```

### 4.5 `convex/bookmarks/mutations.ts` additions
```ts
quickSave: authMutation  // replaces /api/b — creates bookmark, caller does redirect
importBulk: authMutation // replaces /api/imports — applies URL_REGEX, checks limit, serial createBookmark
exportCsv: authMutation  // replaces /api/exports — checks canExport gate, dumps CSV
```

### 4.6 `convex/tools/actions.ts` ("use node")
All tool endpoints become Convex httpActions or `internalAction`s called from HTTP:
```ts
extractContent:  httpAction  // POST /api/tools/extract-content
extractMetadata: httpAction  // POST /api/tools/extract-metadata
extractFavicons: httpAction  // POST /api/tools/extract-favicons
extractOgImages: httpAction  // POST /api/tools/og-images
youtubeMetadata: httpAction  // POST /api/tools/youtube-metadata
```
Each validates input with Zod, calls `fetchHtml` with `TOOL_USER_AGENT`, uses `cheerio` (node), fires PostHog analytics, returns identical JSON shapes.
**Require "use node"** because: cheerio + TurndownService + HEAD requests + `fetch` with custom UA.

### 4.7 `convex/users/actions.ts` ("use node")
```ts
sendBugReport: authAction  // validates schema, sends email via Resend directly (not through queue)
```
Email body (HTML) must match the exact template from §2.5.

### 4.8 `convex/changelog/mutations.ts` + `queries.ts`
Replace Redis with Convex table `changelogDismissals`:
```ts
dismissChangelog: authMutation  // upsert { userId, version } record
checkDismissed: authQuery       // query by { userId, version }, return { isDismissed: boolean }
```
Schema: `changelogDismissals` table with `userId` + `version` + `_creationTime`.

### 4.9 `convex/bookmarks/queries.ts` — OG image httpAction in `convex/http.ts`
```ts
// GET /api/og/bookmark/:bookmarkId — public httpAction, no auth
getBookmarkOgImage: httpAction  // fetches bookmark fields (public), renders SVG, returns image/svg+xml
```
The SVG generation logic (exact colors, dimensions, escapeXml, truncate) must be inlined or in a shared util. The query is public (no auth) — this is by design (og:image meta tags are fetched by crawlers).

### 4.10 `convex/http.ts` route additions
```
GET  /api/og/bookmark/:bookmarkId  → getBookmarkOgImage (public)
GET  /api/health                   → healthCheck (public, simple Convex query)
POST /api/tools/extract-content    → tools.extractContent
POST /api/tools/extract-metadata   → tools.extractMetadata
POST /api/tools/extract-favicons   → tools.extractFavicons
POST /api/tools/og-images          → tools.extractOgImages
POST /api/tools/youtube-metadata   → tools.youtubeMetadata
POST /api/bug-report               → users.sendBugReport
GET  /api/b                        → bookmarks.quickSave (+ redirect)
POST /api/start                    → users.setOnboarding
POST /api/exports                  → bookmarks.exportCsv
POST /api/imports                  → bookmarks.importBulk
POST /api/changelog/dismiss        → changelog.dismissChangelog
POST /api/changelog/check-dismissed → changelog.checkDismissed
PATCH /api/user/profile            → users.updateProfile
POST  /api/user/avatar             → users.uploadAvatar
GET   /api/user/limits             → users.getLimits
PATCH /api/user/public-link        → users.updatePublicLink
```
The `/api/inngest` route is deleted — no replacement needed.

---

## 5. Security Guard Checklist (Phase 17 mapping)

| Guard | Current location | Phase 17 item | Convex target |
|-------|-----------------|---------------|---------------|
| Cookie deduplication | `safe-route.ts:deduplicateCookies` | — (infra concern) | Not needed: Convex handles cookies via BA component; note for BA cookie config |
| Session auth guard | `requireUser` | B2 | `authQuery/authMutation` builders |
| Banned user block | NOT present currently | **B2 GAP** | Add to `authQuery/authMutation/authAction` builders after user resolve |
| Admin role check | `requireAdmin` | A (covered) | `requireAdmin` in builders |
| File upload size 2MB | `api.user.avatar.ts` | **B3** | `users/actions.ts:uploadAvatar` |
| File MIME allowlist | `api.user.avatar.ts` | **B3** | `users/actions.ts:uploadAvatar` |
| API key validation | `api-key-auth.ts:validateApiKey` | B6, B8 | `apiKeyAction` builder + rate limiter |
| Pro plan gate for API | `api-key-auth.ts` line 78 | B6 | `apiKeyAction` builder |
| API key in context | `requireApiKey` returns `{ user, apiKey }` | **B8** | `apiKeyAction` must inject `{ user, apiKey: { id, name } }` |
| Export plan gate (`canExport`) | `api.exports.ts` line 30 | A (covered) | `bookmarks.exportCsv` → check limits |
| Import limit check | `api.imports.ts` availableSlots | A (covered) | `bookmarks.importBulk` |
| Public-link slug uniqueness | `api.user.public-link.ts` | — | `users.updatePublicLink` uniqueness by-index query |
| Public-link slug regex | `api.user.public-link.ts` `/^[a-z0-9-]+$/` | — | Zod validate in mutation args |
| Public DTO field whitelist | NOT in these routes (Phase 05) | **B4** | `bookmarks/queries.getByPublicSlug` |
| Zod input validation on httpActions | `StandardRouteBuilder` | **B5** | All httpActions must Zod-parse before use |
| `canExport` free-plan = 0 | `auth-limits.ts` | — | Phase 17 plan limits in `billing/plans.ts` |
| Production error sanitization | `jsonError` returns generic 500 | **B11** | `ConvexError` codes must not embed internals |
| Secret env hygiene | `env.ts` server-only | **B12** | `npx convex env set` for all secrets; no secrets in VITE_* |
| CORS allowed origins | `cors.ts` | **B9** | `trustedOrigins` + `registerRoutes({ cors: true })` |
| Changelog dismissed (Redis) | `changelog-redis.ts` | — | Convex table replaces Redis |
| Bug report auth guard | `userRoute` | — | `authAction` on `sendBugReport` |
| OG image no auth | `api.og.bookmark.ts` | — | Public httpAction (no auth needed — crawlers) |
| Health endpoint no auth | `api.health.ts` | — | Public httpAction |
| Onboarding flag | `api.start.ts` | — | `authMutation` → `setOnboarding` |
| Inngest signing | `api.inngest.ts` | A (deleted) | Route deleted after Inngest removal |

---

## 6. Edge Cases, Error Handling, and Known Gotchas

### 6.1 Cookie deduplication
The `deduplicateCookies` function in `safe-route.ts` exists to fix a real production bug where cookie duplication caused auth failures. In Convex, the BA component handles cookie parsing. However, the same issue can arise if the web app sets cookies from multiple contexts. Monitor after migration and implement dedup in the BA Convex adapter if needed.

### 6.2 Public OG image — no auth, no ownership check
`/api/og/bookmark/$bookmarkId` accepts any `bookmarkId`. This is intentional (OG crawlers don't authenticate), but it leaks metadata (title, description, type, tags) for private bookmarks. Consider adding a `public: boolean` field to bookmarks and only rendering OG images for public/shared bookmarks, or accept the privacy trade-off.

### 6.3 YouTube metadata rate limiting
The YouTube metadata tool scrapes YouTube directly with a fake UA. YouTube may rate-limit or block by IP. Consider caching results in Convex (by URL/videoId) to reduce hits.

### 6.4 Favicon validation via HEAD
The favicons tool makes N+8 HEAD requests (standard paths + HTML-parsed ones) concurrently with `Promise.all`. In Convex actions, all outbound fetches must complete within the action timeout. For pages with many icons this could be slow. Consider setting a concurrency limit or timeout per HEAD request.

### 6.5 Import serial loop
`api.imports.ts` calls `createBookmark` in a serial `for...of` loop (not parallel). This is intentional — each call's limit check depends on the previous call's result. Preserve serial execution in Convex mutation. However, mutations have time limits — if importing 500 URLs, process in batches using `ctx.scheduler`.

### 6.6 CSV export field ordering
The CSV header is exactly `"title,description,summary,type,url\n"` (note: `ogDescription` maps to column name `"description"`). Field ordering must match exactly for existing user tooling.

### 6.7 Changelog Redis → Convex table migration
Existing dismissed changelog entries in Redis will be lost on migration. Options:
1. One-time migration script to seed the Convex table from Redis
2. Accept loss (changelog dismissal is cosmetic — users just see changelog items again once)
Recommended: accept loss unless the changelog is frequently used.

### 6.8 `sendBugReport` email recipient hardcoded
`to: "help@saveit.now"` is hardcoded in the route. In Convex, use `process.env.HELP_EMAIL` (from `npx convex env set HELP_EMAIL=help@saveit.now`) to match the pattern of other email sends.

### 6.9 Tool analytics in Convex
`captureToolUsage` uses PostHog server-side SDK. In Convex actions with `"use node"`, this works (PostHog Node SDK is Node-only). The IP extraction (`x-forwarded-for` || `x-real-ip`) must still be done from the `Request` object passed to the httpAction.

### 6.10 `api.b.ts` redirect base URL
`Response.redirect(new URL("/app", request.url))` constructs the redirect using `request.url`. In Convex httpActions, `request.url` will be the Convex `.site` URL, not `saveit.now`. Use `process.env.SITE_URL` to construct the correct redirect target: `Response.redirect(new URL("/app", process.env.SITE_URL))`.

### 6.11 Public-link slug index
The uniqueness check `prisma.user.findUnique({ where: { publicLinkSlug: slug } })` requires a unique index on `publicLinkSlug`. In Convex schema, define `defineTable(...).index("by_publicLinkSlug", ["publicLinkSlug"])` on the BA `users` table (or its Convex equivalent). The check must use `.withIndex("by_publicLinkSlug", q => q.eq("publicLinkSlug", slug))`.

### 6.12 Rate limiting for tools endpoints
Currently the tools endpoints have NO rate limiting — they're public. After migration to Convex, add `@convex-dev/rate-limiter` on each tool httpAction keyed by IP (`x-forwarded-for`) to prevent abuse, especially for `extractFavicons` (which fires many outbound requests).

### 6.13 Error response shape for tools vs other routes
- Other routes: `{ error: "..." }` (sometimes with `errors:[]`)
- Tool routes: `{ error: "VALIDATION_ERROR", issues: [{field, message}] }` for Zod errors, `{ error: message }` otherwise
These shapes differ intentionally. Preserve both.

### 6.14 `api.health.ts` Convex replacement
Replace `prisma.$connect()` latency check with a Convex DB read: `await ctx.db.query("users").take(1)`. The response shape stays identical. HTTP status 503 on failure should still be returned via `new Response(body, { status: 503 })`.

### 6.15 Inngest endpoint deletion
`/api/inngest` serves `GET`, `POST`, and `PUT` (Inngest SDK requirement). After migration, this route is removed. The Inngest `serve()` handler and all imported job functions become dead code to be deleted in Phase 15.

### 6.16 `api.start.ts` onboarding field
`prisma.user.update({ data: { onboarding: true } })` — in Convex the `onboarding` field lives on the BA `users` table custom fields. Use `ctx.db.patch(userId, { onboarding: true })` via an internal mutation called from the `authMutation`.

### 6.17 Word count in extract-metadata vs extract-content
`extract-metadata` counts words as `$("body").text().trim().split(/\s+/).filter(Boolean).length` (whole body).
`extract-content` counts on the extracted article section only, with filter `word.length > 0`.
These are intentionally different — preserve each tool's own algorithm.
