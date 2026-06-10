# SaveIt → Convex: Complete Migration Plan (Overview)

This is the master plan to refactor the **entire SaveIt app** onto Convex, with auth
modeled after `nowstack-saas` (web) and `nowstack-mobile` (mobile).

Read this file first, then work the phases in order. Each phase has its own file with
exact steps, file paths, code skeletons, and acceptance criteria.

---

## 0. Locked decisions (from product owner)

| Topic | Decision |
| --- | --- |
| Existing prod data | **Full migration** from Postgres → Convex, **re-embed all bookmarks** with Gemini (clean Convex vector index). |
| Background jobs (Inngest) | **Move fully into Convex** (actions + `ctx.scheduler` + crons). Drop Inngest entirely. |
| AI chat / agents | **Move into Convex** (HTTP action streaming + persistent text streaming). |
| Screenshot / YouTube / PDF worker | **Fold into Convex Node actions** that call the Cloudflare Browser Rendering API directly. Retire `apps/worker`. |

---

## 1. Goal & end state

- **One Convex backend** (`packages/backend`, package `@workspace/backend`) is the single
  source of truth for data, auth, jobs, AI, billing, email, files, and the public API.
- **No Prisma / Postgres, no Inngest, no Upstash Redis, no Next/TanStack API routes for data.**
  (Cloudflare R2 stays for blob storage; Cloudflare Browser Rendering stays as an external API
  called from Convex.)
- `apps/web` (TanStack Start), `apps/mobile` (Expo), `apps/chrome-extension`,
  `apps/firefox-extension`, `packages/saveit` (SDK) + `apps/saveitnow-cli` all talk to the
  **same** Convex deployment via Better Auth.
- Auth = **Better Auth on Convex** via `@convex-dev/better-auth`, user-centric (no organizations).

---

## 2. Target architecture

### Auth model — user-centric (NOT org-centric)
SaveIt has no teams/organizations. We copy the **wiring** of `nowstack-saas` (TanStack Start +
`ConvexBetterAuthProvider` + `convexBetterAuthReactStart` for SSR) and the **mobile** wiring of
`nowstack-mobile` (`expoClient` + SecureStore + bearer tokens), but we use **user-scoped**
function builders (`authQuery` / `authMutation` / `authAction`) like `nowstack-mobile/convex/functions.ts`
instead of `orgQuery`/`orgMutation`.

We use a **local Better Auth component** (`convex/betterAuth/convex.config.ts` →
`defineComponent("betterAuth")`) like `nowstack-saas`, so we can add SaveIt's **custom user
fields** directly to the auth `user` table:
`stripeCustomerId, onboarding, role, banned, banReason, banExpires, unsubscribed, publicLinkSlug, publicLinkEnabled, metadata`.
This keeps `userId === betterAuth user id`, which makes the data migration (existing
`User.id` values) a direct mapping.

### Backend layout (`packages/backend/convex/`)
```
convex.config.ts            # app components: betterAuth (local) + resend
auth.config.ts              # getAuthConfigProvider() — JWT/JWKS bridge
http.ts                     # authComponent.registerRoutes + stripe webhook + /api/v1/* + chat stream
schema.ts                   # domain tables (bookmarks, tags, bookmarkTags, bookmarkOpens,
                            #   bookmarkProcessingRuns, chatConversations, chatUsages, subscriptions)
functions.ts                # authQuery/authMutation/authAction (+ apiKeyAction) builders
betterAuth/
  convex.config.ts          # defineComponent("betterAuth")
  schema.ts                 # BA tables + SaveIt custom user fields
  adapter.ts                # createApi(schema, createAuthOptions)
  data.ts                   # internal helpers to read/patch user rows
auth/
  config.ts                 # createAuth, authComponent, requireAuth, requireAdmin, requireUser
  queries.ts                # getCurrentUser, getSession
  emailTemplates.ts         # markdown email builders (OTP, magic link, ...)
billing/plans.ts            # PLANS + limits (free/pro) + getLimit helpers
bookmarks/                  # queries.ts, mutations.ts, actions.ts (create + reprocess), dto
tags/                       # queries.ts, mutations.ts
search/                     # actions.ts (vector search), helpers.ts
processing/                 # pipeline.ts (orchestrator action) + type handlers + steps
  types/{tweet,youtube,article,product,image,pdf,page}.ts
  embeddings.ts, screenshot.ts (Cloudflare), storage.ts (R2)
chat/                       # http stream action + conversations queries/mutations + usage
stripe/actions.ts          # checkout, portal, processWebhook (internal)
subscriptions/{queries,mutations}.ts
email/{actions.tsx,mutations.ts,markdownEmail.tsx}
files/actions.ts           # R2 upload via S3 SDK
marketing/                  # drip sequences (scheduler) + crons.ts
apiKeys/actions.ts          # API key validation for /api/v1
crons.ts                    # scheduled maintenance + batch marketing
```

### Realtime: free
Inngest Realtime (token endpoint + `@inngest/realtime`) is **removed**. The bookmark detail page
just does `useQuery(api.bookmarks.queries.get, { id })`; as the pipeline patches
`status`/`processingStep`, Convex pushes updates automatically.

---

## 3. Phase sequence & dependencies

Work top-to-bottom. Phases 04–13 can partially overlap once 01–03 land.

| # | Phase | File | Depends on |
| --- | --- | --- | --- |
| 01 | Foundations & dependencies | `01-foundations-and-deps.md` | (backend pkg already exists) |
| 02 | Auth backend (Convex) | `02-auth-backend.md` | 01 |
| 03 | Auth web client (TanStack Start) | `03-auth-web-client.md` | 02 |
| 04 | Domain schema | `04-schema.md` | 01 |
| 05 | Bookmarks + tags CRUD | `05-bookmarks-tags-crud.md` | 02, 04 |
| 06 | Processing pipeline (Inngest → Convex) | `06-processing-pipeline.md` | 04, 05, 11(files) |
| 07 | Search (pgvector → Convex vector) | `07-search.md` | 04, 05, 06 |
| 08 | AI chat / agents (Convex streaming) | `08-chat-agents.md` | 02, 04, 07 |
| 09 | Billing / Stripe | `09-billing-stripe.md` | 02 |
| 10 | Emails + marketing drips | `10-emails-marketing.md` | 02 |
| 11 | File storage + Cloudflare actions | `11-file-storage.md` | 01 |
| 12 | Public API (v1) + extensions | `12-public-api-extensions.md` | 02, 05 |
| 13 | Mobile (Expo) — incl. screen inventory + share-handler | `13-mobile.md` | 02, 05, 07 |
| 14 | Data migration (Postgres → Convex) | `14-data-migration.md` | 02, 04, 05, 06 |
| 15 | Cleanup, deploy, testing, cutover | `15-cleanup-deploy-testing.md` | all |
| 16 | Web frontend migration (data-layer swap) | `16-frontend-web.md` | 03, 05, 07, 08, 09 |
| 17 | Security & middleware parity (cross-cutting checklist) | `17-security-middleware.md` | layered on 02–16; gate before 15 |

> **Frontend note (corrected after verification):** the Next→TanStack **page** migration is largely
> **DONE** — `apps/web/src/routes/` already has ~95 route files (account, account.keys, billing, upgrade
> +success+new-pricing, exports, imports, changelog, docs, verify, tools/*, public pages `p.$bookmarkId`
> /`u.$slug`, **and a full admin panel `admin.*`**). They run on **Prisma + REST today**. Phase 16 is
> therefore a **data-layer swap** (up-fetch hooks + `api.*` Prisma handlers → Convex functions), NOT a
> page rebuild. Genuinely new UI work is minimal. Backend phases (05/07/08/09) sketch the hook wiring;
> Phase 16 owns the full route inventory + the admin panel. Run Phase 16's plumbing early (after Phase 03).

---

## ✅ Verification status

This plan was adversarially fact-checked (auth-library API, Convex platform API, and SaveIt current-state)
against real package sources, the Convex guidelines, and the live codebase. Corrections from that pass are
folded into the relevant phases. The most important confirmed fixes:
- `apiKey` moved to `@better-auth/api-key` in better-auth 1.6.10 (breaking) — Phases 01/02/03.
- Add the `crossDomain` Better Auth plugin for the shared (web+mobile) Convex backend — Phase 02.
- Custom user fields need `additionalFields` in `createAuth` to appear on `getSession().user` — Phase 02.
- `ctx.auth.getUserIdentity()` **throws** (not null) in httpActions — Phase 08.
- Chat messages must be a separate `chatMessages` table, not an array field — Phases 04/08.
- Use native Convex React hooks directly (`useQuery`, `useMutation`, `useAction`, `useConvex`) and do
  not add a TanStack Query / `@convex-dev/react-query` layer — Phases 05/07/16.
- Server billing uses **manual Stripe SDK hooks**, not a Better Auth Stripe plugin — Phase 09.
- The TanStack page migration is already complete (data-layer swap, not rebuild) — Phases 00/16.
- 2026-06-10 app-web sweep: removed `createServerFn` data loaders/actions, retired the React Query
  bridge/dependencies from `apps/web`, and left only the Better Auth `/api/auth/$` proxy route.

---

## 4. Global conventions (copy from nowstack)

1. **Backend is Convex only.** No Prisma / Postgres / Inngest / Redis in new code.
2. **Import aliases:** `@convex/*` → `packages/backend/convex/*` in apps; never relative-path into the backend. Add the alias to each app's `tsconfig` + Vite/Metro config.
3. **Query safety (hard rules):** always `.withIndex()`, never `.filter()`, never unbounded `.collect()` / `.collect().length`. Bound every read with `.take(n)` or `.paginate()`. (See `packages/backend/convex/_generated/ai/guidelines.md`.)
4. **Auth in functions:** use `authQuery` / `authMutation` / `authAction` (user derived server-side). Use `requireAdmin` for admin. **Never** trust a client-passed `userId`. **Never** use raw `ctx.auth` directly.
5. **SSR data in route loaders:** use `fetchAuthQuery` / `fetchAuthMutation` / `fetchAuthAction` from `auth-server.ts` — never a raw Convex client in SSR.
6. **The `convex({ authConfig })` plugin must be LAST** in the Better Auth `plugins` array.
7. **`betterAuth` must be imported from `better-auth/minimal`** inside the Convex backend (Convex runtime is not Node.js).
8. **Stripe webhooks** hit Convex `POST /stripe/webhook` in `convex/http.ts`, not an app route. `*FromWebhook` mutations are `internal` only.
9. **`BETTER_AUTH_COOKIE_PREFIX`** must match on the Convex server and in `convexBetterAuthReactStart({ cookiePrefix })`. SaveIt uses cookie prefix `save-it` today — keep it.
10. **Two URLs everywhere:** `*_CONVEX_URL` (`.convex.cloud`, WebSocket) and `*_CONVEX_SITE_URL` (`.convex.site`, Better Auth HTTP). Web uses `VITE_*`, mobile uses `EXPO_PUBLIC_*`.
11. **Files:** Cloudflare R2 via S3 SDK in `convex/files/actions.ts`. Keep existing `R2_URL` CDN paths so migrated URLs stay valid.
12. **`"use node";`** at the top of any action file using Node built-ins / AWS SDK / sharp / Gemini node SDK; never mix `"use node"` with queries/mutations in the same file.

---

## 5. Env var mapping

Convex **backend** vars (set with `npx convex env set` per deployment, NOT in app `.env`):
```
BETTER_AUTH_SECRET, BETTER_AUTH_COOKIE_PREFIX=save-it, SITE_URL, BETTER_AUTH_TRUSTED_ORIGINS
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID, APPLE_CLIENT_SECRET            # mobile Apple sign-in (optional)
GOOGLE_GENERATIVE_AI_API_KEY                    # Gemini (summaries, embeddings, chat)
OPENAI_API_KEY                                  # if kept
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID, STRIPE_COUPON_ID
RESEND_API_KEY, RESEND_EMAIL_FROM, HELP_EMAIL
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_ENDPOINT, R2_URL
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
POSTHOG_API_KEY (server)                        # optional server analytics
```
App **client** vars:
```
# apps/web/.env
VITE_CONVEX_URL=<...>.convex.cloud
VITE_CONVEX_SITE_URL=<...>.convex.site
VITE_STRIPE_PUBLISHABLE_KEY, VITE_POSTHOG_KEY, VITE_POSTHOG_HOST
# apps/mobile/.env
EXPO_PUBLIC_CONVEX_URL=<...>.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=<...>.convex.site
```
Drop after migration: `DATABASE_URL*`, `UPSTASH_REDIS_*`, `INNGEST_*`, `SCREENSHOT_WORKER_URL`,
`EXPO_PUBLIC_AUTH_URL`, `EXPO_PUBLIC_API_URL`.

---

## 6. Top risks & mitigations

- **Data migration of users + embeddings** (Phase 14) is the highest-risk item. Mitigate: keep
  `userId` stable (= BA user id), migrate to a **fresh Convex prod deployment** in dry-run first,
  re-embed in batches via scheduler, verify counts before DNS/cutover.
- **Convex vector search is single-field** (no native weighted multi-vector). We re-embed to a
  **single combined `searchEmbedding`** per bookmark (title + vectorSummary concatenated) → one
  `vectorIndex` filtered by `userId`. See Phase 04 + 07. This is why "re-embed" was chosen.
- **Mutation transaction limits**: the processing pipeline must run as **actions** that call small
  mutations; never do heavy work in a single mutation. Batch backfills with `ctx.scheduler.runAfter(0, ...)`.
- **OAuth redirect / trustedOrigins**: web + extension + `saveit://` mobile scheme + `exp://` must all
  be in `trustedOrigins`. Get this right early (Phase 02) to avoid auth loops.
- **Public API parity**: the SDK/CLI/extensions depend on `/api/v1/*` and `/api/bookmarks`. Keep the
  exact request/response shapes (Phase 12) so external clients don't break.

---

## 7. Definition of done

- All apps build (`pnpm ts` + `pnpm lint` clean in `apps/web`; Expo type-checks; extensions build).
- Auth works on web (cookie) + mobile (bearer) + extension (cookie) + SDK (API key).
- A new bookmark flows create → processing (reactive UI) → searchable, end-to-end on Convex.
- Search, chat, billing, emails, public API verified against the parity checklist (Phase 15).
- Prisma, Inngest, Redis, `apps/worker`, and dead API routes removed; `convex deploy` wired into CI.
