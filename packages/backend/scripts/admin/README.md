# Admin Search Repair

Use this when semantic search is missing imported or stale bookmarks because
`searchEmbedding` / `embeddingModel` was not populated.

Prerequisites:

- Convex deployment env has `ALLOW_MIGRATION=true`.
- Convex deployment env has `MIGRATION_SECRET` set.
- Local shell or `scripts/admin/.env` has `CONVEX_URL` and the same
  `MIGRATION_SECRET`.

Dry-run one page:

```bash
cd packages/backend
pnpm exec tsx scripts/admin/reembed-search.ts --limit 100
```

Schedule the background repair:

```bash
cd packages/backend
pnpm exec tsx scripts/admin/reembed-search.ts --start --batch-size 20
```

The repair only embeds bookmarks with a missing vector, an invalid vector
dimension, or a stale `embeddingModel`. It reuses existing `vectorSummary`,
falling back to `summary`, then `title`.
