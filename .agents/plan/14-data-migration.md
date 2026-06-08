# Phase 14 — Data Migration (Postgres → Convex) + Re-embed

**Goal:** migrate all production data from Postgres/Prisma into Convex, keeping `userId` stable, and
re-embed every bookmark with Gemini so Convex vector search works.

**Decision:** full migration + re-embed. Highest-risk phase — do it against a **fresh Convex prod
deployment**, dry-run first, verify counts, then cut over (Phase 15).

**Depends on:** Phase 02 (auth tables), 04 (schema), 05 (mutations/counters), 06 (embeddings action).

---

## 0. Strategy
- Keep `User.id` (Postgres) == betterAuth `user._id` (Convex) so all `userId` FKs map 1:1.
- Migrate **users + oauth accounts** (no passwords; SaveIt uses OTP/magic/oauth). **Sessions are not
  migrated** — users re-authenticate (acceptable; cookies/tokens differ anyway).
- Migrate domain data: bookmarks, tags, bookmarkTags, bookmarkOpens, subscriptions, chatConversations.
  `chatUsages`, `bookmarkProcessingRuns` history are optional (skip or migrate minimally).
- **Re-embed** bookmarks (don't migrate pgvector values) → generate `searchEmbedding` post-import.

## 1. Migration tooling
Create `packages/backend/scripts/migrate/` (Node, run with `tsx`):
- `export-postgres.ts` — read each table via `pg`/Prisma into JSONL files (chunked). Strip pgvector
  columns (we re-embed).
- `import-convex.ts` — use `ConvexHttpClient` with `CONVEX_DEPLOY_KEY` (admin) to call **internal**
  import mutations in batches (respect transaction limits: ~500 docs/mutation, schedule the rest).
- Internal import mutations in `convex/migration/import.ts` (gated to internal/admin):
  - `importUsers` — insert into betterAuth `user` table (with custom fields) via `betterAuth/data`
    using the **original id**. Insert `account` rows for github/google.
  - `importBookmarks`, `importTags`, `importBookmarkTags`, `importBookmarkOpens`,
    `importSubscriptions`, `importConversations` — map fields per the Phase 04 schema; preserve
    `createdAt`. Rebuild `userCounters` from the imported counts.

> If `@convex-dev/better-auth` doesn't allow specifying the user `_id` on insert, fall back to a
> mapping table `legacyUserId → convexUserId` and rewrite all `userId` references during import. Decide
> this early by testing one user insert — it changes the import code path significantly.

## 2. Re-embed pass
After bookmarks are imported (status preserved), run a backfill:
- `convex/migration/reembed.ts` — `internalAction` that pages through bookmarks lacking a current
  `searchEmbedding`, builds `title + "\n" + vectorSummary`, calls the Gemini embed helper (Phase 06),
  patches `searchEmbedding` + `embeddingModel`, and `ctx.scheduler.runAfter(0, …)` to continue the next
  batch. Throttle to respect Gemini rate limits.
- Bookmarks missing `vectorSummary` (older/failed ones): either re-run the full pipeline (Phase 06
  `reprocess`) or embed from `title + summary`. Decide per-data-quality during dry-run.

## 3. Verification (before cutover)
- Row counts per table: Postgres vs Convex match (allow for intentionally-skipped tables).
- Spot-check N users: bookmarks visible, tags attached, subscription plan correct.
- Run sample searches; compare top results to production for relevance sanity.
- Confirm `userCounters` match actual bookmark counts (limits depend on this).
- Confirm a migrated `pro` user still resolves to `pro` (subscription import correct).

## 4. Dry-run → real run
1. Point scripts at a **staging Convex deployment**; run full export+import+reembed; verify.
2. Schedule a maintenance window. Freeze writes on the old app (read-only banner) to avoid drift.
3. Run the real migration against **prod Convex**; verify counts.
4. Proceed to Phase 15 cutover.

## Acceptance criteria
- 100% of users + bookmarks + tags + active subscriptions present in Convex with stable ids.
- Every (or ≥99%, with a documented re-process queue for the rest) bookmark has a valid
  `searchEmbedding`; search returns results for migrated users.
- A migrated user can log in (OTP/oauth) and see their data.

## Risks
- **ID stability** is the linchpin — validate the betterAuth insert-with-id path on day one.
- **Embedding cost/time** for the full corpus — batch + throttle; estimate volume × Gemini price first.
- **Write drift** during migration — freeze writes or run a delta pass for rows changed after export.
- **PII / secrets** — run migration with least-privilege creds; never commit exported JSONL.
