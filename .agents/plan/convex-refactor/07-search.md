# Phase 07 — Search (pgvector → Convex vector search)

**Goal:** replace the Postgres pgvector + Redis search stack with Convex vector search + the existing
filter/boost logic, exposed as a Convex action.

**Current logic to port:** `apps/web/src/lib/search/{advanced-search,cached-search,search-by-query,
search-combiners,embedding-cache}.ts` and `api.bookmarks.ts` (the GET search branch).

**Depends on:** Phase 04 (`by_search_embedding` vector index), Phase 06 (embeddings populated).

---

## Why an action (not a query)
Convex `vectorSearch` is only callable from **actions**. Flow: action runs `ctx.vectorSearch(...)` →
gets `{_id, _score}` candidates → calls an internal query to load the bookmark docs (+ tags) → applies
boosts/filters → returns DTOs. The web list calls this action via TanStack Query.

## `packages/backend/convex/search/actions.ts`

```ts
export const search = action({  // wrap with auth: resolve user via requireAuth(ctx)
  args: { query: v.optional(v.string()), filter: v.optional(...), matchingDistance: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    // 1. No query/filters → default list (delegate to bookmarks.queries.list via runQuery)
    if (!args.query && !hasFilters(args.filter)) return runDefaultList(ctx, user.id, args);

    // 2. Domain query (looks like a hostname) → internal query on by_user_url (ILIKE-equivalent prefix)
    if (isDomainQuery(args.query)) return runDomainSearch(ctx, user.id, args.query);

    // 3. Tag-only / type-only filter → internal query via bookmarkTags.by_user_tag / by_user_status
    if (isFilterOnly(args)) return runFilterSearch(ctx, user.id, args.filter);

    // 4. Text query → embed (RETRIEVAL_QUERY) → vectorSearch → load + boost
    const embedding = await embedQueryGemini(args.query);   // 1536-d, task RETRIEVAL_QUERY
    const results = await ctx.vectorSearch("bookmarks", "by_search_embedding", {
      vector: embedding,
      limit: 50,
      filter: (q) => q.eq("userId", user.id),               // + optional type filter
    });
    const docs = await ctx.runQuery(internal.bookmarks.queries.loadForSearch, {
      ids: results.map((r) => r._id), userId: user.id,
    });
    return rankAndDto(docs, results, user.id, args.matchingDistance);
  },
});
```

## Porting the scoring/boost logic
- **Score**: Convex returns cosine `_score` in `[-1, 1]`. Map to the app's 0–100 scale
  (`score = 100 * (_score)` or `100 * (1 - distance)`); keep the relative ordering identical.
- **`matchingDistance` spread**: replicate "keep results within MIN+distance" by trimming the candidate
  list after sorting by score (the old SQL `WHERE distance <= MIN(distance) + $3`).
- **Open-frequency boost**: load `bookmarkOpens` counts per candidate (`by_bookmark_user`) and add the
  multiplier exactly as `search-combiners.ts` does.
- **Combined embedding**: because we re-embedded to one `searchEmbedding`, the old `0.2 title / 0.8
  summary` weighting is baked into the embedding text. No multi-vector math needed.
- **Model-version guard**: filter candidates to `embeddingModel === current` (parity with the old
  `metadata->>'embeddingModel'` check) — either as a vector index `filterField` or post-filter.

## Caching
Drop Upstash Redis (`SearchCache`, `EmbeddingCache`). Convex queries are reactive + fast; if query
embedding cost matters, add a tiny `queryEmbeddingCache` table keyed by `(model, hash)` with TTL via a
cron sweep — **optional**, only if Gemini embedding latency is a problem in practice.

## Wire the frontend
`use-bookmarks.ts` debounced search branch calls the Convex action directly with
`useAction(api.search.actions.search)` or `useConvex().action(...)` and owns its local pagination state.
Actions are not reactive, which is fine for search. The no-query branch keeps the reactive
`bookmarks.queries.list` pagination from Phase 05.

## Acceptance criteria
- Text search returns semantically relevant results matching today's quality on a sample set.
- Domain queries, tag filters, type filters, and "no query" default list all behave as before.
- Frequently-opened bookmarks rank higher (open boost works).
- No Postgres, no Redis involved.

## Risks
- Vector index `filterFields` must be declared at schema time (`userId`, `type`); adding more later
  requires a schema push + reindex.
- `ctx.vectorSearch` `limit` max is 256 — fine for per-user search; pagination beyond top-K needs an
  app-level approach (rarely needed here).
- Score scale differences may shift the `matchingDistance` cut-off; tune against real data during
  Phase 14 verification.
