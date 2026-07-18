# SaveIt Postgres → Convex Migration

## Prerequisites

- Node 18+ and `tsx` installed globally (`npm i -g tsx`)
- `pg` and `@types/pg` in devDependencies (already added to packages/backend/package.json)
- Access to the source Postgres database (`DATABASE_URL`)
- The target Convex deployment URL (`CONVEX_URL`)
- `ALLOW_MIGRATION=true` and a high-entropy `MIGRATION_SECRET` set on the Convex deployment environment

---

## Step 0 — Enable the migration gate

In the Convex dashboard (or via `npx convex env set`), set:

```
ALLOW_MIGRATION=true
MIGRATION_SECRET="generate-a-long-random-value"
```

This enables the gated import mutations for callers that also know the secret.
**Remove both values when the migration is done.**

---

## Step 1 — Export from Postgres

```bash
cd packages/backend

DATABASE_URL="postgres://user:pass@host:5432/dbname" \
  tsx scripts/migrate/export-postgres.ts
```

Output: `./migration-export/*.jsonl` (one JSON object per line per table).

Tables exported: `user`, `account`, `apiKey`, `tag`, `bookmark` (no embeddings),
`bookmarkTag`, `bookmarkOpen`, `subscription`, `chatConversation`.

---

## Step 2 — Import into Convex

```bash
cd packages/backend

CONVEX_URL="https://your-deployment.convex.cloud" \
MIGRATION_SECRET="same-value-as-convex-env" \
  tsx scripts/migrate/import-convex.ts
```

The script:

1. Reads all JSONL files.
2. Imports in dependency order: users → API keys → tags → bookmarks → bookmarkTags → bookmarkOpens → subscriptions → conversations → counters.
3. Threads `legacyId → convexId` maps where needed.
4. Rewrites all foreign-key references (userId/referenceId, bookmarkId, tagId).
5. Preserves `Bookmark.legacyId` on the Convex document and reruns by that id.
6. Rebuilds `userCounters` for each user.

The migration is rerun-safe for users, API keys, subscriptions, conversations,
and bookmarks: users dedupe by email, API keys by `configId + key`,
subscriptions by Stripe subscription or user, conversations by
`userId + updatedAt + title`, and bookmarks by legacy bookmark id.

---

## Step 3 — Trigger re-embedding

After the import completes, kick off the background re-embed pass:

```bash
# Preferred admin wrapper with a dry-run first:
cd packages/backend
pnpm exec tsx scripts/admin/reembed-search.ts --limit 100
pnpm exec tsx scripts/admin/reembed-search.ts --start --batch-size 20

# Via the Convex CLI:
npx convex run migration/reembed_helpers:startReembed '{"migrationSecret":"same-value-as-convex-env"}'

# Or programmatically (add to your import script or run separately):
node -e "
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('./convex/_generated/api');
const client = new ConvexHttpClient(process.env.CONVEX_URL);
client.mutation(api.migration.reembed_helpers.startReembed, {
  migrationSecret: process.env.MIGRATION_SECRET,
}).then(console.log);
"
```

The `reembedBatch` action pages through bookmarks with a missing
`searchEmbedding`, invalid vector dimensions, or a stale `embeddingModel`,
embeds each with Gemini, and self-schedules the next batch (throttled to 2 s
between batches).

---

## Step 4 — Verify

- Row counts match Postgres: compare JSONL line counts vs Convex admin dashboard.
- Spot-check 5–10 users: bookmarks visible, tags attached, subscription correct.
- Run a search query and confirm results are returned.
- Confirm `userCounters.bookmarkCount` matches actual counts for a few users.
- Confirm a `pro` user has an active subscription with correct `plan`.
- Confirm migrated API keys appear on `/account/keys` and authenticate against `/api/v1/*`.
- Confirm old `/p/:legacyBookmarkId` and `/app/b/:legacyBookmarkId` links resolve.

---

## Step 5 — Disable the gate

```bash
npx convex env set ALLOW_MIGRATION false
npx convex env remove MIGRATION_SECRET
# or remove the variable entirely
```

---

## Field Mapping Reference

| Postgres table                | Postgres column                                                    | Convex table       | Convex field                      |
| ----------------------------- | ------------------------------------------------------------------ | ------------------ | --------------------------------- |
| user                          | id                                                                 | betterAuth/user    | \_id (new)                        |
| user                          | name                                                               | betterAuth/user    | name                              |
| user                          | email                                                              | betterAuth/user    | email                             |
| user                          | emailVerified                                                      | betterAuth/user    | emailVerified                     |
| user                          | image                                                              | betterAuth/user    | image                             |
| user                          | createdAt                                                          | betterAuth/user    | createdAt (ms)                    |
| user                          | updatedAt                                                          | betterAuth/user    | updatedAt (ms)                    |
| user                          | role                                                               | betterAuth/user    | role                              |
| user                          | banned/banReason/banExpires                                        | betterAuth/user    | banned/banReason/banExpires       |
| user                          | stripeCustomerId                                                   | betterAuth/user    | stripeCustomerId                  |
| user                          | onboarding                                                         | betterAuth/user    | onboarding                        |
| user                          | onboardingUpgradeChoice                                            | betterAuth/user    | onboardingUpgradeChoice           |
| user                          | unsubscribed                                                       | betterAuth/user    | unsubscribed                      |
| user                          | publicLinkSlug                                                     | betterAuth/user    | publicLinkSlug                    |
| user                          | publicLinkEnabled                                                  | betterAuth/user    | publicLinkEnabled                 |
| account                       | accountId                                                          | betterAuth/account | accountId                         |
| account                       | providerId                                                         | betterAuth/account | providerId                        |
| account                       | accessToken/refreshToken/idToken/scope                             | betterAuth/account | same                              |
| apikey                        | id                                                                 | betterAuth/apikey  | \_id (new)                        |
| apikey                        | configId                                                           | betterAuth/apikey  | configId (defaults to "default")  |
| apikey                        | userId/referenceId                                                 | betterAuth/apikey  | referenceId (rewritten)           |
| apikey                        | key/name/start/prefix                                              | betterAuth/apikey  | same; hashed key is not rehashed  |
| apikey                        | permissions/metadata                                               | betterAuth/apikey  | normalized text                   |
| apikey                        | refill/rateLimit/request/expires fields                            | betterAuth/apikey  | same, dates as ms                 |
| "Tag"                         | id                                                                 | tags               | \_id (new)                        |
| "Tag"                         | userId                                                             | tags               | userId (rewritten)                |
| "Tag"                         | name/type                                                          | tags               | name/type                         |
| "Bookmark"                    | id                                                                 | bookmarks          | legacyId                          |
| "Bookmark"                    | userId                                                             | bookmarks          | userId (rewritten)                |
| "Bookmark"                    | url/type/title/summary/note/preview                                | bookmarks          | same                              |
| "Bookmark"                    | vectorSummary/faviconUrl/ogImageUrl/ogDescription/imageDescription | bookmarks          | same                              |
| "Bookmark"                    | metadata                                                           | bookmarks          | metadata                          |
| "Bookmark"                    | status/starred/read                                                | bookmarks          | same                              |
| "Bookmark"                    | createdAt/updatedAt                                                | bookmarks          | createdAt/updatedAt (ms)          |
| "Bookmark"                    | titleEmbedding/vectorSummaryEmbedding                              | —                  | SKIPPED (re-embedded)             |
| "BookmarkTag"                 | bookmarkId/tagId/userId                                            | bookmarkTags       | rewritten IDs                     |
| "BookmarkOpen"                | bookmarkId/userId/openedAt                                         | bookmarkOpens      | rewritten IDs, openedAt (ms)      |
| subscription                  | userId (referenceId)                                               | subscriptions      | userId (rewritten)                |
| subscription                  | plan/stripeCustomerId/stripeSubscriptionId                         | subscriptions      | same                              |
| subscription                  | status/currentPeriodStart/currentPeriodEnd                         | subscriptions      | status/periodStart/periodEnd (ms) |
| subscription                  | cancelAtPeriodEnd/seats                                            | subscriptions      | same                              |
| "ChatConversation"            | userId/title/likes                                                 | chatConversations  | userId (rewritten)/title/likes    |
| "ChatConversation"            | createdAt/updatedAt                                                | chatConversations  | createdAt/updatedAt (ms)          |
| "ChatConversation".messages[] | role/content                                                       | chatMessages       | role/content/conversationId       |
