# Phase 15 — Cleanup, Deploy, Testing & Cutover

**Goal:** remove the legacy stack, wire Convex into CI/deploy, run the full parity test pass, and cut
over production.

**Depends on:** all prior phases.

---

## 1. Remove the legacy backend
Delete / retire once each replacement is verified:
- **Prisma / Postgres**: `packages/database` (Prisma client, schema, migrations), all `@workspace/database`
  imports, `db:generate`/`db:migrate`/`db:deploy` turbo tasks, `DATABASE_URL*` env.
- **Inngest**: `apps/web/src/lib/inngest/**`, `/api/inngest` route, `inngest`/`@inngest/realtime` deps,
  `INNGEST_*` env, the `inngest:dev` script.
- **Upstash Redis**: `apps/web/src/lib/redis.ts`, search/embedding/changelog caches, `UPSTASH_*` env.
- **Cloudflare worker**: `apps/worker` (folded into Convex actions, Phase 11), `SCREENSHOT_WORKER_URL`.
- **Dead API routes** (most of `apps/web/src/routes/api.*.ts` — they currently call Prisma): once their
  Convex equivalents land, remove `api.bookmarks*.ts`, `api.tags*.ts`, `api.chat*.ts`, the subscribe-token
  route, `api.user.*` (limits/profile/avatar/public-link), `api.exports.ts`/`api.imports.ts`/`api.upgrade.ts`,
  `api.mobile.checkout.ts`, `api.bug-report.ts`, `api.changelog.*`, `api.tools.*`, `api.admin.*`,
  `api.og.bookmark.*`, `api.unsubscribe.*`, `api.b.ts`, `api.start.ts`, **`api.inngest.ts`** (Inngest gone),
  and **`api.fake-worker*.ts`** (dev screenshot stub, no longer needed). Move `api.webhooks.stripe.ts` →
  `convex/http.ts` `/stripe/webhook` and `api.v1.*` → Convex (Phase 12). Keep only `api.auth.$.ts` (proxy).
  Then remove `up-fetch` data hooks.
- Old Better Auth on Prisma: `apps/web/src/lib/{auth.ts,auth-params.ts,auth-limits.ts,auth/*}` (replaced
  by Convex auth + the new `auth-client.ts`/`auth-server.ts`).

Grep guard: `rg "@workspace/database|inngest|upstash|up-fetch|SCREENSHOT_WORKER_URL"` should return only
intentional leftovers (or nothing) in `apps/web/src`.

## 2. Turbo / CI / Vercel
- `turbo.json`: drop `db:*` tasks if Prisma is gone; ensure `@workspace/backend` `dev` runs under
  `turbo dev` (Convex dev alongside web). Keep the `CONVEX_*` env entries (already added).
- **Production deploy**: change the build to deploy Convex then build web:
  `npx convex deploy --cmd 'turbo run build:web'` (needs `CONVEX_DEPLOY_KEY` + `VITE_CONVEX_URL` +
  `VITE_CONVEX_SITE_URL` set in Vercel). Update root `vercel-build`.
- Set **all backend env vars** (Section 5 of `00-overview.md`) on prod + preview Convex deployments via
  `npx convex env set`.
- Point the Stripe webhook to `https://<prod>.convex.site/stripe/webhook`; update OAuth callback URLs to
  the Convex site URL; configure `/api/v1` routing (Phase 12 decision).

## 3. Testing
- **Backend unit**: `convex-test` + `vitest` (`environment: "edge-runtime"`) for queries/mutations —
  auth gating, limits, bookmark CRUD, tag uniqueness, search ranking, webhook upsert idempotency.
- **Web**: `pnpm ts` + `pnpm lint` clean; existing vitest suite green; Playwright e2e for sign-in,
  save bookmark, search, chat, upgrade.
- **Mobile**: type-check; manual smoke of auth + bookmark + search + checkout.
- **Extensions**: load unpacked, sign-in, save current tab.
- **SDK/CLI**: run against staging Convex with an API key; assert response shapes (parity tests).

## 4. Parity checklist (must pass before cutover)
- [ ] Auth: OTP, magic link, GitHub, Google (web); OTP + Google/Apple (mobile); cookie (extension);
      API key (SDK).
- [ ] Bookmark create → processing (reactive) → READY with summary/tags/preview/embedding.
- [ ] All 8 types (article, page, image, pdf, youtube, tweet, product, video) process correctly.
- [ ] Search: semantic, domain, tag, type, default list, open-frequency boost.
- [ ] Limits: free caps enforced; pro unlocked; custom limits honored.
- [ ] Billing: upgrade, cancel, portal, webhook → plan change; promo code mint.
- [ ] Emails: OTP/magic transactional; new-subscriber/subscription/limit drips; unsubscribe respected.
- [ ] Chat: stream, persist, usage limit, RAG over user's bookmarks.
- [ ] Public link (publicLinkSlug) read works.
- [ ] Mobile + extensions full smoke.

## 5. Cutover
1. Complete Phase 14 dry-run on staging; fix issues.
2. Maintenance window + write freeze on the old app.
3. Real migration to prod Convex; verify counts (Phase 14 §3).
4. Deploy web/mobile/extensions pointing at prod Convex; flip DNS / release.
5. Monitor: Convex dashboard (errors, function latency), Stripe webhook deliveries, email sends.
6. Keep Postgres read-only as a rollback safety net for N days before decommissioning.

## Acceptance criteria
- Production runs entirely on Convex; legacy services removed from the deploy.
- Parity checklist fully green; rollback path documented.

## Risks
- Removing legacy too early → broken prod. Remove only after the replacement is verified in staging.
- `convex deploy` in CI needs the deploy key + correct env; test the deploy pipeline on preview first.
- Forgotten env var on prod Convex → silent feature failure; diff `convex env list` against the
  Section-5 checklist.
