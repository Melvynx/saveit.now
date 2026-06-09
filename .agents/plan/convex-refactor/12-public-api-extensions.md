# Phase 12 — Public API (v1) + Browser Extensions

**Goal:** preserve the external HTTP API used by the SDK/CLI (`/api/v1/*`, API-key auth) and the browser
extensions (session-cookie auth), now served by Convex — without breaking existing clients.

**Current consumers:**
- `packages/saveit` SDK + `apps/saveitnow-cli`: `Authorization: Bearer <apiKey>` → `https://saveit.now/api/v1`
  (`GET/POST /bookmarks`, `DELETE /bookmarks/:id`, `GET /bookmarks/random`, `GET/POST /tags`).
- `apps/chrome-extension` / `apps/firefox-extension`: session cookie (`credentials: "include"`) →
  `GET /api/auth/get-session`, `POST /api/bookmarks` (+ transcript/metadata), `POST /api/bookmarks/:id/upload-screenshot`.

**Depends on:** Phase 02 (apiKey plugin + auth), 05 (bookmark/tag functions), 11 (uploads).

---

## API-key auth helper
`convex/apiKeys/actions.ts` — `validateApiKey(token)`: call Better Auth `auth.api.verifyApiKey({ body: { key } })`
via `authComponent.getAuth`, resolve the user, assert `pro` plan (`limits.apiAccess === 1`). Port
`apps/web/src/lib/auth/api-key-auth.ts`.

`convex/functions.ts` — add an `apiKeyAction` builder that reads `Authorization: Bearer` from the request
(HTTP action context) and injects `{ user, apiKey: { id, name } }` (Phase 17 B8 — keep the key in ctx for
audit, matching the current `requireApiKey` shape). **Rate limiting (Phase 17 B6):** the plan keeps BA
per-key rate limiting disabled for parity, so add an explicit throttle on `/api/v1/*` — either re-enable
`apiKey({ rateLimit: { enabled: true, maxRequests, timeWindow } })` or a `@convex-dev/rate-limiter` keyed by
the key's `referenceId` (userId). Also validate all `/api/v1/*` inputs with Zod (Phase 17 B5).

## `/api/v1/*` on Convex HTTP router
> CORRECTED: the v1 handlers already exist as TanStack routes wired to Prisma —
> `apps/web/src/routes/api.v1.bookmarks.ts`, `api.v1.bookmarks.random.ts`, `api.v1.bookmarks.$bookmarkId.ts`,
> `api.v1.tags.ts`, `api.v1.public.$slug.bookmarks.ts` (using `apiRoute` from `@/lib/safe-route` +
> `createBookmark`/`cachedAdvancedSearch`). This phase **ports those handlers to Convex**, keeping the exact
> request/response shapes. You can either move them to `convex/http.ts` httpActions (recommended, so the
> SDK can hit the Convex `.site` URL) or keep thin TanStack routes that call Convex functions.

Mount in `convex/http.ts` (httpActions). Keep request/response **shapes identical** to today's SDK
expectations (see `packages/saveit/src/sdk.ts` + `http.ts` for the contract):
```
GET    /api/v1/bookmarks            → bookmarks.queries.list (DTO)
POST   /api/v1/bookmarks            → bookmarks.mutations.create
DELETE /api/v1/bookmarks/:id        → bookmarks.mutations.remove
GET    /api/v1/bookmarks/random     → bookmarks.queries.random
GET    /api/v1/tags                 → tags.queries.list
POST   /api/v1/tags                 → tags.mutations.create
```
Each handler: `validateApiKey` → call the corresponding internal query/mutation with the resolved
`userId` → return JSON matching the current SDK response schema (Zod-validate to guarantee parity).

> Base URL change: the SDK currently hardcodes `https://saveit.now/api/v1`. Options: (a) keep that path
> by routing `saveit.now/api/v1/*` to the Convex site URL at the edge/proxy, or (b) bump the SDK default
> `baseUrl` to the Convex site URL and release a new SDK version. Prefer (a) for zero client breakage;
> document whichever is chosen.

## Browser extensions
- Update each extension's `auth-client.ts` `baseURL` to the app origin (auth proxies to Convex). Keep
  `credentials: "include"` + CORS. `trustedOrigins` (Phase 02) must include `chrome-extension://*` and
  `moz-extension://*`.
- Replace direct `POST /api/bookmarks` fetches with either: the Convex client (`ConvexHttpClient` +
  session token) calling `api.bookmarks.mutations.create`, or the `/api/v1` HTTP endpoints with a
  session. Screenshot capture (`chrome.tabs.captureVisibleTab`) → `files/actions.uploadBookmarkScreenshot`.
- Verify session retrieval (`get-session`) works cross-origin from the extension.

## Acceptance criteria
- SDK/CLI: list/create/delete/random bookmarks + list/create tags all work against Convex with an API
  key, with unchanged response shapes (existing SDK version keeps working).
- Extensions: sign-in (cookie), save current tab (with screenshot + optional transcript) works.
- `pro`-only API access enforced; free users get the expected error.

## Risks
- **Response-shape drift** breaks the published SDK silently — pin the contract with Zod tests against
  `packages/saveit` types.
- Cross-origin cookies for extensions need correct CORS + `SameSite` handling on the Convex `.site`
  domain; test in a real browser, not just curl.
- API-key verification round-trips Better Auth; cache the resolved user per request to avoid double calls.
