# Phase 16 — Web Frontend Migration (data-layer swap)

**Goal:** migrate the web app's data layer from Prisma/REST (`up-fetch` hooks + TanStack `api.*` route
handlers that call Prisma) to Convex functions. The Next→TanStack page migration is **already done** —
this phase is overwhelmingly a **data-layer swap**, plus filling two genuinely-missing UIs.

> ⚠️ CORRECTED after verification: an earlier draft claimed many pages were "deleted and never ported."
> That was wrong (a truncated directory listing). The TanStack routes already exist — `apps/web/src/routes/`
> has ~95 files including `account`, `account.keys`, `billing`, `upgrade(+success+new-pricing)`, `exports`,
> `imports`, `changelog(+versions)`, `docs(+$slug)`, `verify`, `tools.*`, `producthunt`, `privacy`,
> `terms`, public bookmark pages `p.$bookmarkId` / `u.$slug`, and a full **admin panel** (`admin.*`).
> They are wired to Prisma today. The job is to repoint them at Convex.

**Depends on:** 03 (auth client/SSR), 05 (bookmarks/tags), 07 (search), 08 (chat), 09 (billing),
10 (emails/unsubscribe), 11 (uploads), 12 (public API).

---

## A. Two layers to migrate per feature
Each feature currently has **(1) a UI route** (`*.tsx`) using `up-fetch` hooks, and **(2) a TanStack API
route handler** (`api.*.ts`) that runs Prisma/business-logic server-side. Convex collapses both:
- UI hooks: `up-fetch` → `convexQuery` / `useConvexMutation` / `convexAction`.
- `api.*.ts` handlers: delete (logic now lives in Convex functions) — except the few that must stay HTTP
  (Better Auth `api.auth.$`, Stripe webhook → moves to `convex/http.ts`, `/api/v1/*` → Phase 12).

## B. Authenticated app pages — repoint to Convex
All exist today; swap their data layer.

| Route (exists) | Current handler/hook | Convex target |
| --- | --- | --- |
| `app.tsx` | `use-bookmarks` → `api.bookmarks.ts` (Prisma+search) | `api.bookmarks.queries.list` + `api.search.actions.search` |
| `app.b.$bookmarkId.tsx` | `use-bookmark` + subscribe token | `api.bookmarks.queries.get` (reactive; drop `api.bookmarks.$id.subscribe.ts`) |
| `app.agents.tsx` | `api.chat.ts` + `api.chat.conversations.*` + `api.chat.usage.ts` | Convex chat (Phase 08) |
| `account.tsx` | `api.user.profile.ts`, `api.user.avatar.ts` | `authClient.updateUser` / Convex user mutation + `files` upload |
| `account.tsx` (public link) | `api.user.public-link.ts` | mutation patching `user.publicLinkSlug/publicLinkEnabled` (Phase 02 `betterAuth/data`) |
| `account.keys.tsx` | Better Auth apiKey (Prisma) | Better Auth `apiKey` client list/create/revoke (Phase 12) — **exists, just rewire** |
| `billing.tsx` | `api.upgrade.ts` / portal | `api.subscriptions.queries.getMine` + `api.stripe.actions.createBillingPortal` |
| `upgrade.tsx` / `upgrade.new-pricing.tsx` / `upgrade.success.tsx` | `api.upgrade.ts` | `api.stripe.actions.createCheckout` (Phase 09) |
| `verify.tsx` | OTP/magic verify | `authClient` verify flows (Phase 03) |
| `exports.tsx` | `api.exports.ts` (Prisma dump, `canExport` gate) | Convex export action (pro-gated) |
| `imports.tsx` | `api.imports.ts` (bulk Prisma create) | Convex bulk-import action/mutation (batched `create`) |
| `tags.tsx` | `api.tags.ts` (+ bulk-delete/cleanup/management/refactor) | `api.tags.*` Convex queries/mutations |

## C. Admin panel — repoint to Convex (was MISSED in the first draft)
Exists: `admin.tsx`, `admin.users.$userId.tsx`, `admin.conversations(.​$id).tsx`, `admin.send-email.tsx`
(+ `api.admin.users.$userId.custom-limits.ts`, `api.admin.send-email.ts`). These are gated to
`role === "admin"`. Migrate to **`adminQuery`/`adminMutation`/`adminAction`** builders (Phase 02):
- user list/detail + ban/impersonate + set `metadata.customLimits`.
- conversation moderation (read/list/delete).
- send-email (admin broadcast) → Convex action using the email pipeline (Phase 10).
Build the corresponding `convex/admin/*` functions (mirror nowstack-saas `convex/admin/*`).

## D. Public / content pages
- `p.$bookmarkId.tsx`, `p.$bookmarkId.read.tsx`, `u.$slug.tsx` (public bookmark / public profile) →
  public Convex queries (`api.bookmarks.queries.getByPublicSlug`, a public-profile query). **DB-backed.**
- `changelog(.versions).tsx` → content; `api.changelog.dismiss.ts` / `check-dismissed.ts` (Redis read-state)
  → a small Convex mutation/query or drop.
- `docs(.$slug).tsx`, `posts(.$slug).tsx`, `producthunt`, `about`, `contact`, `help`, `pricing`,
  `tools.*` → mostly static/content; remove any Prisma/REST calls. `tools.*` client tools call
  `api.tools.*` (extract-content/favicons/metadata/og-images/youtube-metadata) → Convex actions
  (reuse the Cloudflare/metadata logic from Phase 11) or keep as thin public HTTP actions.

## E. Shared plumbing (verify, Phase 03)
Single `ConvexReactClient` from router context; `ConvexBetterAuthProvider` in `__root.tsx`; keep
`ConvexQueryClient` + `QueryClient` in `providers.tsx` (drop raw `ConvexProvider`); `nuqs`, dialog-manager,
dark-mode, posthog kept. Client guard `useSession()` + SSR `getRequiredUser()`. Remove
`apps/web/src/lib/up-fetch.ts` and the `api.*.ts` Prisma handlers once each feature is migrated.

## F. Correct Convex client call patterns (verified)
```ts
// Reactive read
const { data } = useQuery(convexQuery(api.bookmarks.queries.list, args));
// Action via TanStack Query (convexAction returns full options — do NOT nest in { queryFn })
const { data } = useQuery(convexAction(api.search.actions.search, { query }));
// Mutation — useConvexMutation is a hook; call at top level, never inside useMutation's arg
const create = useConvexMutation(api.bookmarks.mutations.create);
const { mutate } = useMutation({ mutationFn: (a) => create(a) });   // or call create(a) directly
```

## G. Migration order
1. Plumbing (E).
2. Core app: `app`, `app.b.$bookmarkId`, `app.agents`.
3. Account / billing / upgrade / keys / exports / imports.
4. Admin panel (C).
5. Public + content + tools (D).

## Acceptance criteria
- No `up-fetch` or Prisma-backed `api.*` data calls remain in `apps/web/src` (only auth/webhook/v1 HTTP).
- Every page above reads/writes via Convex; admin panel works via `adminQuery/Mutation`.
- Public bookmark/profile pages render via public Convex queries.
- `pnpm ts` + `pnpm lint` clean; Playwright e2e: sign-in → save → search → upgrade → account → admin.

## Risks
- Scope is "swap ~30 API handlers + their hooks," not "rebuild pages" — track per-feature so nothing is
  half-migrated (UI on Convex but handler still hitting Prisma).
- The admin panel + custom-limits + impersonation must keep working (depends on Phase 02 `admin` plugin).
- `tools.*` public endpoints may be unauthenticated — keep them public but rate-limited in Convex.
