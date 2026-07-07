---
name: convex-cost-optimizer
description: Use when optimizing Convex database read bandwidth, documents-read cost, query indexes, full-table scans, function-level usage dashboard findings, or code that uses .filter(), unbounded .collect(), N+1 reads, or expensive reactive Convex queries.
---

# Convex Cost Optimizer

Reduce Convex database bandwidth and read amplification while preserving query
correctness. This skill is narrower than `convex-performance-audit`: use it
when the signal is specifically high database read bandwidth, high documents
read, full-table scans, index design, or expensive query syntax.

## Required Context

- Before editing `convex/**/*.ts`, read `convex/_generated/ai/guidelines.md`.
- Read `.agents/rules/convex.md` and `.agents/rules/development-commands.md`
  before changing schema or Convex functions.
- If the user has dashboard data, treat it as the strongest signal.
- If no dashboard data is available, use `npx convex insights --details` when
  supported, or audit the code directly and state that the ranking is
  code-derived rather than usage-derived.

## Dashboard Triage

Start from the Convex usage dashboard database bandwidth section:

1. Sort by database read bandwidth or documents read.
2. Open the function-level breakdown.
3. Prioritize functions where "Documents Read" is much higher than "Documents
   Returned".
4. Map each hot function name to the matching file under `convex/`.
5. Inspect client callsites using `useQuery`, `usePaginatedQuery`,
   `fetchAuthQuery`, or route loaders so you understand call frequency.

A high documents-read/documents-returned ratio usually means a full-table scan,
unbounded read, or read-after-filter pattern.

## Code Audit Patterns

Search for these first:

```bash
rg -n "\\.filter\\(|\\.collect\\(\\)|collect\\(\\)\\.length|for \\(.*await ctx\\.db\\.get|ctx\\.db\\.query" convex
```

Flag these patterns:

- `ctx.db.query("table").filter(...)`
- `ctx.db.query("table").collect()` followed by JavaScript `.filter(...)`
- `collect().length` for counts
- unbounded `.collect()` on user-facing or reactive paths
- `ctx.db.get(...)` inside loops when the loop can grow
- repeated helper calls that each do their own query
- list screens returning full documents when the UI only needs summaries
- reactive `useQuery` data that only needs a point-in-time server read

## Fix Order

Apply the smallest high-impact fix first.

1. Replace full scans with indexes.
2. Bound result sets with `.take(n)` or `.paginate(...)`.
3. Replace `collect().length` with maintained counters or aggregate documents.
4. Batch foreign-key lookups and avoid N+1 query loops.
5. Return smaller DTOs from hot list functions.
6. Denormalize or introduce digest/summary tables only when measured cost,
   row size, or call frequency justifies the migration complexity.

When an index or denormalized field depends on old data being backfilled, use
the migration helper workflow instead of assuming old documents have the new
shape.

## Index Syntax

Schema:

```ts
messages: defineTable({
  channelId: v.id("channels"),
  body: v.string(),
}).index("by_channelId", ["channelId"]),
```

Query:

```ts
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
  .take(50);
```

Use Convex index syntax exactly:

- In schema, define `.index("by_fieldName", ["fieldName"])`.
- For compound indexes, include all fields in the name, for example
  `.index("by_organizationId_and_status", ["organizationId", "status"])`.
- In `.withIndex()`, compare indexed fields with `q.eq("fieldName", value)`,
  not `q.eq(q.field("fieldName"), value)`.
- Put equality fields first in compound indexes. Add range or ordering fields
  only when the query needs them.
- One compound index can serve a prefix query. Do not add both `by_org` and
  `by_org_and_status` unless the single-field index is needed for `_creationTime`
  ordering.
- Use `.withSearchIndex(...)` for text search instead of scanning and filtering.

## Correctness Checks

For every rewritten query, verify:

- The new index returns the same records as the old filter.
- Optional or newly-added fields do not exclude older documents unexpectedly.
- Sorting remains correct after switching to the index.
- Authorization checks still happen before returning data.
- Pagination cursors and limits still match the UI contract.
- Sibling functions over the same table are inspected for the same pattern.

## Verification

Run the smallest checks that cover the change:

- `npx convex dev --once` for schema and generated API changes.
- `cd web-app && npm run typecheck` for TypeScript correctness.
- `cd mobile-app && npx tsc --noEmit` when mobile imports generated APIs.
- `cd mobile-app && npm run lint` when mobile style-sensitive files changed.
- Re-check dashboard/insights after deploy when the user is validating real
  cost reduction; local checks prove syntax and behavior, not production
  bandwidth savings.

Update docs or release notes only when this repo already has a matching
changelog/release-note convention for the touched area.
