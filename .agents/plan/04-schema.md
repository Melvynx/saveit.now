# Phase 04 — Domain Schema (Convex)

**Goal:** model every domain table in Convex with correct indexes and a single combined
`searchEmbedding` vector index (re-embed strategy). Auth tables live in the betterAuth component
(Phase 02); this file is the app `convex/schema.ts`.

**Source of truth:** `packages/database/prisma/schema.prisma`.

> Key constraint: **Convex vector search is single-field**. The current app stores two embeddings
> (`titleEmbedding`, `vectorSummaryEmbedding`) and combines them `0.2/0.8` in SQL. We re-embed to one
> `searchEmbedding` (1536-d) from `title + "\n" + vectorSummary` and index *that*. Optionally keep the
> two raw embeddings as plain arrays for offline re-ranking, but search uses the combined one.

---

## `packages/backend/convex/schema.ts`

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const bookmarkType = v.union(
  v.literal("VIDEO"), v.literal("ARTICLE"), v.literal("PAGE"), v.literal("IMAGE"),
  v.literal("YOUTUBE"), v.literal("TWEET"), v.literal("PDF"), v.literal("PRODUCT"),
);
const bookmarkStatus = v.union(
  v.literal("PENDING"), v.literal("PROCESSING"), v.literal("READY"), v.literal("ERROR"),
);

export default defineSchema({
  bookmarks: defineTable({
    userId: v.string(),                 // == betterAuth user id
    url: v.string(),
    type: v.optional(bookmarkType),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    note: v.optional(v.string()),
    preview: v.optional(v.string()),    // R2 screenshot URL
    vectorSummary: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    ogImageUrl: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    imageDescription: v.optional(v.string()),
    metadata: v.optional(v.any()),      // transcript, youtubeId, articleContent, pdfUrl, tweetId, dims, etc.
    status: bookmarkStatus,
    starred: v.boolean(),
    read: v.boolean(),
    // search
    searchEmbedding: v.optional(v.array(v.float64())),       // 1536-d combined (indexed)
    embeddingModel: v.optional(v.string()),                  // e.g. "gemini-embedding-2:1536"
    // processing
    processingStep: v.optional(v.number()),                  // for reactive progress UI
    processingError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_url", ["userId", "url"])                 // dedupe + domain lookups
    .index("by_user_starred", ["userId", "starred"])
    .index("by_user_read", ["userId", "read"])
    .searchIndex("by_title_text", { searchField: "title", filterFields: ["userId"] })
    .vectorIndex("by_search_embedding", {
      vectorField: "searchEmbedding",
      dimensions: 1536,
      filterFields: ["userId", "type"],
    }),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("USER"), v.literal("IA")),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),               // unique (userId, name) enforced in mutation

  bookmarkTags: defineTable({                                  // join table (efficient tag filtering)
    bookmarkId: v.id("bookmarks"),
    tagId: v.id("tags"),
    userId: v.string(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_tag", ["tagId"])
    .index("by_user_tag", ["userId", "tagId"]),

  bookmarkOpens: defineTable({                                 // frequency boost for search
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    openedAt: v.number(),
  })
    .index("by_bookmark_user", ["bookmarkId", "userId"])
    .index("by_user_opened", ["userId", "openedAt"]),

  bookmarkProcessingRuns: defineTable({                        // audit trail + monthly run quota
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    status: v.union(v.literal("STARTED"), v.literal("COMPLETED"), v.literal("FAILED")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_bookmark", ["bookmarkId"]),

  chatConversations: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    likes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_updated", ["userId", "updatedAt"]),

  // CORRECTED: messages are a child table, NOT a v.any() array on the conversation.
  // A growing array would hit the 1MB doc limit + rewrite the whole doc on every append (guideline §schema).
  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.any(),                                         // AI SDK message parts (one row per message)
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  chatUsages: defineTable({                                    // per-query billing tracker
    userId: v.string(),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  subscriptions: defineTable({                                 // Stripe (referenceId = userId)
    userId: v.string(),
    plan: v.string(),                                          // "free" | "pro"
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),
});
```

## Notes & decisions
- **Tags**: kept as a join table (`bookmarkTags`) so "bookmarks with tag X" uses `.withIndex("by_tag")`
  instead of scanning. For reads, the bookmark DTO joins tag names via `by_bookmark`.
- **`BookmarkChunk`** (RAG chunks) was only partially used; **defer** — add later only if chat RAG
  needs sub-document chunks. Not in v1 schema.
- **Counts** (`/api/bookmarks/info`, plan limits): Convex has no count operator. Maintain a denormalized
  counter doc per user *or* bound with `.take(limit+1)` for "at/over limit" checks. For exact totals use
  a `userCounters` table updated in create/delete mutations (recommended for limits). Add:
  ```ts
  userCounters: defineTable({ userId: v.string(), bookmarkCount: v.number(),
    monthKey: v.string(), monthlyRuns: v.number() }).index("by_user", ["userId"]),
  ```
- **`embeddingModel`** filter: search only matches docs with the current model version (parity with the
  current SQL `metadata->>'embeddingModel'` guard) — store it as a top-level field for index filtering.

## Acceptance criteria
- `npx convex dev --once` accepts the schema (vector index + search index compile).
- Field types cover every Prisma column that's still in use (cross-check against the inventory).

## Risks
- Vector dimension must exactly match the Gemini embedding output (1536). Mismatch → index push fails.
- `metadata: v.any()` is convenient but unvalidated; document the expected shape in a DTO/zod type used
  by actions (Phase 06) to avoid drift.
