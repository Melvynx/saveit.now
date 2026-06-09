# Phase 17 — Security & Middleware Parity

**Goal:** guarantee every middleware / safety mechanism from `nowstack-saas`, `nowstack-mobile`, AND
SaveIt's current guards survives the migration. This phase is a **checklist + specs** layered on the other
phases — implement each item where noted.

**Why this exists:** verification found the core patterns covered (auth builders, ownership checks, webhook
signature verification, internal-only `*FromWebhook`, `trustedOrigins`, CORS, cookie-prefix match,
`convex()`-last, SecureStore, `"skip"` pattern) but surfaced concrete gaps where a current protection would
be silently lost. Those are below.

**Reference:** `nowstack-saas/convex/utils/errors.ts`, `convex/auth/{config,functions}.ts`,
`src/lib/{api-middleware,env}.ts`; `nowstack-mobile/convex/{functions,auth}.ts`; SaveIt
`apps/web/src/lib/{safe-route,auth/api-key-auth,cors,auth-limits}.ts`,
`routes/{api.bookmarks.$bookmarkId.upload-screenshot,api.v1.public.$slug.bookmarks,api.unsubscribe.$userId,api.webhooks.stripe}.ts`.

---

## A. Already covered (verified — do not regress)
Auth builders (`authQuery/Mutation/Action`, `adminQuery/...`) · server-derived `userId`, never client-passed ·
per-entity ownership asserts (bookmark/tag/conversation) · `requireAdmin` + admin double-gate ·
`session.impersonatedBy` impersonation · Stripe raw-body + signature verify · `processWebhook` internalAction ·
`*FromWebhook` internal-only · webhook idempotency · `trustedOrigins` (web + `saveit://` + `exp://` +
`chrome-extension://*` + `moz-extension://*`) · `registerRoutes({ cors: true })` · cookie prefix `save-it`
both sides · `convex()` last · `betterAuth/minimal` · `"use node"` isolation · `v.*` arg validators ·
SecureStore tokens · `useQuery(…, "skip")` · plan/limit + custom-limits enforcement · BA `rateLimit` table.

## B. Gaps to CLOSE (each is a real protection at risk)

### B1. Typed Convex error helpers — `convex/utils/errors.ts`  (HIGH; → Phase 02)
The plan calls `throwUnauthorized()` but never defines it. Port nowstack-saas `convex/utils/errors.ts`:
`throwUnauthorized / throwForbidden / throwNotFound / throwValidationError / throwLimitReached`, each
throwing `ConvexError<{ code, message }>`. Every auth/ownership/limit check uses these → consistent, typed,
non-leaky errors the client can branch on.

### B2. Banned-user check INSIDE the function builders  (HIGH; → Phase 02 §6)
`requireAuth` / `authQuery` / `authMutation` / `authAction` must, after resolving the user, check
`user.banned === true` (and `banExpires`) and `throwForbidden("Account banned")`. The Phase 03 client
redirect is NOT sufficient — a banned user with a still-valid cookie could otherwise call mutations.
Mirrors `nowstack-mobile/convex/functions.ts` (`bannedAt` check in `readUser`).

### B3. File-upload size + MIME allowlist  (HIGH; → Phase 11)
`uploadBookmarkScreenshot` / `uploadUserImage` must port the current guards from
`api.bookmarks.$bookmarkId.upload-screenshot.ts`: `MAX_FILE_SIZE = 2 * 1024 * 1024` and
`ALLOWED_IMAGE_TYPES = [image/jpeg, image/jpg, image/png, image/webp, image/gif]`. Reject oversize/wrong
type BEFORE writing to R2. Without this an authed user can push arbitrary/huge blobs to R2.

### B4. Public DTO must whitelist fields  (HIGH; → Phase 05 `getByPublicSlug`)
The public bookmark/profile query must **explicitly whitelist** returned fields and force
`starred = false, read = false`, and must NOT return `note`, `userId`, raw `metadata`, or embeddings.
Port the field-stripping from `api.v1.public.$slug.bookmarks.ts`. Validate the `type` filter against the
`BookmarkType` union. Gate on `user.publicLinkEnabled === true`.

### B5. Input validation for HTTP actions  (HIGH; → Phases 08, 09, 12)
Convex `httpAction`s receive a raw `Request` with no schema layer (unlike the current
`StandardRouteBuilder`/`safe-route.ts`). For every httpAction (`/api/v1/*`, `/chat`, `/stripe/webhook`,
public `tools/*`): parse + validate body/query with **Zod** before use (e.g. `limit:
z.coerce.number().min(1).max(100)`, `matchingDistance: z.coerce.number().min(0.1).max(2)`, `url: z.string().url()`).
Convex queries/mutations keep their `v.*` validators. State this as a hard rule.

### B6. API key rate limiting on `/api/v1/*`  (MED-HIGH; → Phase 12)
The plan sets `apiKey({ rateLimit: { enabled: false } })` (parity with today) but the public HTTP API then
has no throttle. Either (a) enable BA per-key rate limits (`rateLimit: { enabled: true, maxRequests, timeWindow }`)
or (b) add `@convex-dev/rate-limiter` keyed by the key's `referenceId` (userId) inside each `/api/v1/*`
handler. Pick one and document it.

### B7. Atomic chat quota check-and-increment  (MED; → Phase 08)
Today `checkAndIncrementChatUsage` uses a Prisma `$transaction` to read-count → assert → insert in one shot
(prevents TOCTOU bypass under concurrency). In Convex, do the read-assert-insert in a **single
`authMutation`** (mutations are serialized transactions) — do NOT split across a query + a separate mutation.

### B8. `apiKeyAction` must expose the key in context  (LOW; → Phase 12)
The current `requireApiKey` returns `{ user, apiKey: { id, name } }`. The `apiKeyAction` builder must inject
`{ user, apiKey: { id, name } }` so audit/analytics that read the key name don't silently get `undefined`.

### B9. Dynamic allowed-hosts for preview deploys  (MED; → Phase 02 + 15)
Port nowstack-saas `getAllowedHosts()` / `baseURL: { allowedHosts, fallback, protocol }` so Vercel preview
URLs (`https://saveit-now-*`, `*.vercel.app`) and Convex preview deployments are accepted. Today these live
in `cors.ts` `allowedOrigins`; map them into `BETTER_AUTH_TRUSTED_ORIGINS` / allowedHosts at deploy time, or
auth + extensions break silently on previews.

### B10. App Store test-account OTP bypass  (MED; → Phase 02 emailOTP)
In `emailOTP.sendVerificationOTP`, if `email === process.env.APPSTORE_TEST_EMAIL` (e.g.
`appstoretest@email.com`), return a fixed OTP and skip email send — so Apple/Google reviewers can sign in.
Mirrors `nowstack-mobile/convex/auth.ts`. Without it, store review can't authenticate → rejection risk.

### B11. Production error sanitization  (MED; → Phase 03/16)
Any surviving web HTTP route (the `api.auth.$` proxy + transient routes during migration) needs a
`handleApiError` (port nowstack-saas `src/lib/api-middleware.ts` + `errors/http-error.ts`,
`application-error.ts`): map `HttpError`→status, `ZodError`→422, unknown→500 returning a generic message in
`PROD` (no stack/internal leak). Convex `ConvexError` codes (B1) must likewise not embed internals.

### B12. Secret/env hygiene  (MED; → Phase 01/03)
Keep all server secrets (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, R2 keys, `*_CLIENT_SECRET`) out of the
client bundle: only `VITE_*` / `EXPO_PUBLIC_*` reach the browser/app. Extend SaveIt's existing zod
`apps/web/src/lib/env.ts` (server) and keep a separate client env surface; never reference a non-`VITE_`
secret in client code. Set all backend secrets via `npx convex env set` (never in `.env`). Don't commit
secrets (Stripe/Apple/Google/Resend/R2/Convex deploy keys).

### B13. Unsubscribe link must be tokenized  (MED; → Phase 10)
Today `api.unsubscribe.$userId.ts` accepts a bare `userId` with NO auth (anyone can unsubscribe anyone).
The Convex replacement must require an HMAC/signed token in the unsubscribe URL (verify before flipping
`user.unsubscribed`). Fix the latent bug during migration, don't reproduce it.

### B14. Dev-only mutation guards  (LOW-MED; → Phase 09/14)
Any dev/test-only mutation (e.g. granting `pro` for testing, or migration import mutations in Phase 14)
must be gated: `process.env.ALLOW_DEV_BYPASS === "true" || process.env.CONVEX_DEPLOYMENT?.startsWith("dev:")`,
and migration import functions must be `internal` (never public). Defense-in-depth from
`nowstack-mobile/convex/payments/entitlements.ts`.

### B15. Admin routes return 404, not 403  (MINOR; → Phase 16 §C)
Non-admins hitting `admin.*` should get 404 (not 403) to avoid revealing the routes exist — parity with
current `admin.tsx`.

## C. Acceptance criteria
- `convex/utils/errors.ts` exists and is used by every auth/ownership/limit/throw site.
- Banned user is blocked at the Convex function layer (not just the client).
- Upload actions enforce 2MB + MIME allowlist; public DTO leaks no private fields.
- Every httpAction validates its inputs (Zod); `/api/v1/*` is rate-limited.
- Preview/staging origins authenticate; store-review test account can sign in.
- No server secret is reachable from a client bundle; unsubscribe requires a signed token.
- A security-review pass (`/security-review` or manual) over the Convex functions finds no missing
  ownership/auth check and no unbounded/`.filter()` query.

## D. Risks
- These are easy to forget because they're cross-cutting — treat Section B as a gate before cutover (Phase 15).
- Re-enabling rate limits can break the SDK/extensions if set too low; pick limits ≥ current real usage.
