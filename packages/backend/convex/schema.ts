import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Domain schema (app tables). Auth tables live in the betterAuth component
 * (see betterAuth/schema.ts). `userId` everywhere === betterAuth user id.
 *
 * Search strategy: Convex vector search is single-field, so we re-embed each
 * bookmark to ONE combined `searchEmbedding` (title + "\n" + vectorSummary)
 * and index that. See Phase 04/07.
 */

export const bookmarkType = v.union(
  v.literal("VIDEO"),
  v.literal("ARTICLE"),
  v.literal("PAGE"),
  v.literal("IMAGE"),
  v.literal("YOUTUBE"),
  v.literal("TWEET"),
  v.literal("PDF"),
  v.literal("PRODUCT"),
);

export const bookmarkStatus = v.union(
  v.literal("PENDING"),
  v.literal("PROCESSING"),
  v.literal("READY"),
  v.literal("ERROR"),
);

export const tagType = v.union(v.literal("USER"), v.literal("IA"));

export default defineSchema({
  bookmarks: defineTable({
    userId: v.string(), // == betterAuth user id
    legacyId: v.optional(v.string()),
    url: v.string(),
    type: v.optional(bookmarkType),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    note: v.optional(v.string()),
    preview: v.optional(v.string()), // R2 screenshot URL
    vectorSummary: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    ogImageUrl: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    imageDescription: v.optional(v.string()),
    // Bounded metadata only: IDs, external object URLs/keys, dimensions,
    // provenance, counts. Do not store media bytes, transcripts, HTML,
    // article markdown, data URLs, or other raw extracted content here.
    metadata: v.optional(v.any()),
    status: bookmarkStatus,
    starred: v.boolean(),
    read: v.boolean(),
    // search — single combined embedding (1536-d) is the indexed field
    searchEmbedding: v.optional(v.array(v.float64())),
    embeddingModel: v.optional(v.string()), // e.g. "gemini-embedding-001:1536"
    // processing progress (drives reactive UI; replaces Inngest realtime)
    processingStep: v.optional(v.number()),
    processingError: v.optional(v.string()),
    // @convex-dev/workflow run id — lets deletion cancel an in-flight run
    workflowId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_legacy_id", ["legacyId"])
    .index("by_user_type_created", ["userId", "type", "createdAt"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_user_url", ["userId", "url"])
    .index("by_user_starred", ["userId", "starred"])
    .index("by_user_read", ["userId", "read"])
    .searchIndex("by_title_text", {
      searchField: "title",
      filterFields: ["userId"],
    })
    .vectorIndex("by_search_embedding", {
      vectorField: "searchEmbedding",
      dimensions: 1536,
      filterFields: ["userId", "type", "embeddingModel"],
    }),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    type: tagType,
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  bookmarkTags: defineTable({
    bookmarkId: v.id("bookmarks"),
    tagId: v.id("tags"),
    userId: v.string(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_tag", ["tagId"])
    .index("by_user_tag", ["userId", "tagId"]),

  bookmarkOpens: defineTable({
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    openedAt: v.number(),
  })
    .index("by_bookmark_user", ["bookmarkId", "userId"])
    .index("by_user_opened", ["userId", "openedAt"]),

  bookmarkProcessingRuns: defineTable({
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    status: v.union(
      v.literal("STARTED"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_bookmark", ["bookmarkId"]),

  searchEmbeddingRepairJobs: defineTable({
    kind: v.literal("SEARCH_EMBEDDINGS"),
    startedByUserId: v.string(),
    status: v.union(
      v.literal("RUNNING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
    ),
    batchSize: v.number(),
    scanned: v.number(),
    candidates: v.number(),
    embedded: v.number(),
    skipped: v.number(),
    failed: v.number(),
    currentCursor: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_kind_created", ["kind", "createdAt"])
    .index("by_kind_status_created", ["kind", "status", "createdAt"]),

  chatConversations: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    likes: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_updated", ["userId", "updatedAt"]),

  // Messages are a child table (NOT an array on the conversation) to avoid the
  // 1MB doc limit + full-doc rewrites on every append.
  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    userId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.any(), // AI SDK message parts (one row per message)
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  chatUsages: defineTable({
    userId: v.string(),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  subscriptions: defineTable({
    userId: v.string(), // referenceId == userId
    plan: v.string(), // "free" | "pro"
    provider: v.optional(v.union(v.literal("stripe"), v.literal("appstore"))),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    appstoreOriginalTransactionId: v.optional(v.string()),
    appstoreProductId: v.optional(v.string()),
    appstoreLastVerifiedAt: v.optional(v.number()),
    status: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    seats: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_appstore_original_transaction", [
      "appstoreOriginalTransactionId",
    ])
    .index("by_status", ["status"]),

  // Denormalized per-user counters (Convex has no count operator) for limits.
  userCounters: defineTable({
    userId: v.string(),
    bookmarkCount: v.number(),
    monthKey: v.string(), // e.g. "2026-06"
    monthlyRuns: v.number(),
    monthlyChatQueries: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_monthKey", ["monthKey"]),

  // Per-user dismissed changelog versions.
  changelogDismissals: defineTable({
    userId: v.string(),
    version: v.string(),
  }).index("by_user_version", ["userId", "version"]),
});
