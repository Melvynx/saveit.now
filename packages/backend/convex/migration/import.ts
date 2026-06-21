/**
 * migration/import.ts — Public (but env-gated) mutations for bulk data import.
 *
 * Security model: every exported mutation calls assertMigrationAllowed() first.
 * Set ALLOW_MIGRATION=true in the Convex environment variables ONLY during the
 * migration window. The gate is enforced server-side so callers with a
 * ConvexHttpClient (no auth token) cannot import data outside that window.
 *
 * Import order (maintained by the import-convex.ts script):
 *   1. importUsers       — betterAuth user + account rows
 *   2. importApiKeys     — betterAuth api-key rows
 *   3. importTags        — tags (userId already rewritten)
 *   4. importBookmarks   — bookmarks (userId rewritten, embeddings omitted)
 *   5. importBookmarkTags
 *   6. importBookmarkOpens
 *   7. importSubscriptions
 *   8. importConversations  (conversations + messages)
 *   9. rebuildUserCounters
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../functions";
import { throwForbidden } from "../utils/errors";

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

function assertMigrationAllowed(migrationSecret: string): void {
  if (process.env.ALLOW_MIGRATION !== "true") {
    throwForbidden("Migration not enabled");
  }
  const expectedSecret = process.env.MIGRATION_SECRET;
  if (!expectedSecret || migrationSecret !== expectedSecret) {
    throwForbidden("Migration not authorized");
  }
}

// ---------------------------------------------------------------------------
// Return type shared by import helpers
// ---------------------------------------------------------------------------

const idMapEntry = v.object({ legacyId: v.string(), convexId: v.string() });

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "true" || lowered === "1") return true;
    if (lowered === "false" || lowered === "0") return false;
  }
  return Boolean(value);
}

function stableJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// 1. importUsers
// ---------------------------------------------------------------------------

/**
 * importUsers — inserts users (+ their oauth accounts) into the betterAuth
 * component tables. Returns a legacyId→convexId map.
 *
 * Each element of `users` is the raw Postgres row from the `user` table,
 * plus an optional `accounts` array (rows from the `account` table that belong
 * to this user).
 *
 * Field mapping (Postgres → Convex betterAuth user):
 *   id               → (becomes new Convex _id; returned as convexId)
 *   name             → name
 *   email            → email
 *   emailVerified    → emailVerified (boolean)
 *   image            → image
 *   createdAt (Date) → createdAt (number ms)
 *   updatedAt (Date) → updatedAt (number ms)
 *   role             → role
 *   banned           → banned
 *   banReason        → banReason
 *   banExpires (Date)→ banExpires (number ms)
 *   stripeCustomerId → stripeCustomerId
 *   onboarding       → onboarding
 *   unsubscribed     → unsubscribed
 *   publicLinkSlug   → publicLinkSlug
 *   publicLinkEnabled→ publicLinkEnabled
 *   metadata         → metadata
 *
 * Account field mapping (Postgres account → betterAuth account):
 *   id              → (ignored — Convex auto-generates)
 *   userId          → (rewritten to new convexId)
 *   accountId       → accountId
 *   providerId      → providerId
 *   accessToken     → accessToken
 *   refreshToken    → refreshToken
 *   idToken         → idToken
 *   scope           → scope
 *   createdAt       → createdAt (number ms)
 *   updatedAt       → updatedAt (number ms)
 */
export const importUsers = mutation({
  args: { users: v.array(v.any()), migrationSecret: v.string() },
  returns: v.array(idMapEntry),
  handler: async (ctx, { users, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    const result: { legacyId: string; convexId: string }[] = [];

    for (const user of users) {
      const legacyId: string = String(user.id);

      const convexId: string = await ctx.runMutation(
        components.betterAuth.data.insertUser,
        {
          name: user.name ?? "",
          email: user.email ?? "",
          emailVerified: Boolean(user.emailVerified),
          image: user.image ?? null,
          createdAt: toMs(user.createdAt),
          updatedAt: toMs(user.updatedAt),
          role: user.role ?? null,
          banned: user.banned ?? null,
          banReason: user.banReason ?? null,
          banExpires: user.banExpires != null ? toMs(user.banExpires) : null,
          stripeCustomerId: user.stripeCustomerId ?? null,
          onboarding: user.onboarding ?? null,
          unsubscribed: user.unsubscribed ?? null,
          publicLinkSlug: user.publicLinkSlug ?? null,
          publicLinkEnabled: user.publicLinkEnabled ?? null,
          metadata: user.metadata ?? undefined,
        },
      );

      result.push({ legacyId, convexId });

      // Insert oauth accounts.
      const accounts: unknown[] = Array.isArray(user._accounts)
        ? user._accounts
        : [];
      for (const acc of accounts) {
        const a = acc as Record<string, unknown>;
        await ctx.runMutation(components.betterAuth.data.insertAccount, {
          userId: convexId,
          accountId: String(a.accountId ?? a.id ?? ""),
          providerId: String(a.providerId ?? ""),
          accessToken: (a.accessToken as string | null | undefined) ?? null,
          refreshToken: (a.refreshToken as string | null | undefined) ?? null,
          idToken: (a.idToken as string | null | undefined) ?? null,
          scope: (a.scope as string | null | undefined) ?? null,
          createdAt: toMs(a.createdAt as string | number | Date),
          updatedAt: toMs(a.updatedAt as string | number | Date),
        });
      }
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// 2. importApiKeys
// ---------------------------------------------------------------------------

/**
 * importApiKeys — inserts legacy Better Auth API key rows into the current
 * betterAuth component schema. userId/referenceId is already rewritten, the
 * legacy hashed key is preserved as-is, and reruns match by (configId, key).
 */
export const importApiKeys = mutation({
  args: { rows: v.array(v.any()), migrationSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, { rows, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    let upsertedCount = 0;

    for (const row of rows) {
      const configId = normalizeText(row.configId)?.trim() || "default";
      const prefix = normalizeText(row.prefix)?.trim() || "saveit_";
      const referenceId = normalizeText(row.referenceId ?? row.userId)?.trim();
      const key = normalizeText(row.key)?.trim();
      if (!referenceId || !key) continue;

      const data = {
        configId,
        name: normalizeText(row.name),
        start: normalizeText(row.start),
        referenceId,
        prefix,
        key,
        refillInterval: normalizeNumber(row.refillInterval),
        refillAmount: normalizeNumber(row.refillAmount),
        lastRefillAt:
          row.lastRefillAt != null ? toMs(row.lastRefillAt as any) : null,
        enabled: normalizeBoolean(row.enabled, true),
        rateLimitEnabled: normalizeBoolean(row.rateLimitEnabled, false),
        rateLimitTimeWindow: normalizeNumber(row.rateLimitTimeWindow),
        rateLimitMax: normalizeNumber(row.rateLimitMax),
        requestCount: normalizeNumber(row.requestCount) ?? 0,
        remaining: normalizeNumber(row.remaining),
        lastRequest:
          row.lastRequest != null ? toMs(row.lastRequest as any) : null,
        expiresAt: row.expiresAt != null ? toMs(row.expiresAt as any) : null,
        createdAt: toMs(row.createdAt as any),
        updatedAt: toMs(row.updatedAt as any),
        permissions: normalizeText(row.permissions),
        metadata: normalizeText(row.metadata),
      };

      await ctx.runMutation(
        (components.betterAuth.data as any).insertApiKey,
        data,
      );
      upsertedCount += 1;
    }

    return upsertedCount;
  },
});

// ---------------------------------------------------------------------------
// 3. importTags
// ---------------------------------------------------------------------------

/**
 * importTags — inserts tag rows. userId is already rewritten by the script.
 *
 * Field mapping (Postgres "Tag" → Convex tags):
 *   id      → (auto-generated; legacy stored in legacyId)
 *   userId  → userId (already convex userId after rewrite)
 *   name    → name
 *   type    → type ("USER" | "IA")
 */
export const importTags = mutation({
  args: { tags: v.array(v.any()), migrationSecret: v.string() },
  returns: v.array(idMapEntry),
  handler: async (ctx, { tags, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    const result: { legacyId: string; convexId: string }[] = [];

    for (const tag of tags) {
      const legacyId = String(tag.id);
      // Idempotent: reuse existing tag for (userId, name) so re-runs don't duplicate.
      const existing = await ctx.db
        .query("tags")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_user_name", (q: any) =>
          q.eq("userId", String(tag.userId)).eq("name", String(tag.name)),
        )
        .first();
      if (existing) {
        result.push({ legacyId, convexId: existing._id as string });
        continue;
      }
      const convexId = await ctx.db.insert("tags", {
        userId: String(tag.userId),
        name: String(tag.name),
        type: (tag.type === "IA" ? "IA" : "USER") as "USER" | "IA",
      });
      result.push({ legacyId, convexId: convexId as string });
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// 4. importBookmarks
// ---------------------------------------------------------------------------

/**
 * importBookmarks — inserts bookmark rows.
 * searchEmbedding / embeddingModel are NOT imported — the reembed pass fills them.
 * userId is already rewritten by the script.
 *
 * Field mapping (Postgres "Bookmark" → Convex bookmarks):
 *   id                → legacyId (stable legacy identity for reruns)
 *   userId            → userId (rewritten to convex id)
 *   url               → url
 *   type              → type
 *   title             → title
 *   summary           → summary
 *   note              → note
 *   preview           → preview
 *   vectorSummary     → vectorSummary
 *   faviconUrl        → faviconUrl
 *   ogImageUrl        → ogImageUrl
 *   ogDescription     → ogDescription
 *   imageDescription  → imageDescription
 *   metadata          → metadata (JSON)
 *   status            → status
 *   starred           → starred (default false)
 *   read              → read (default false)
 *   createdAt         → createdAt (number ms)
 *   updatedAt         → updatedAt (number ms)
 *   titleEmbedding / vectorSummaryEmbedding → SKIPPED (re-embed pass)
 */
export const importBookmarks = mutation({
  args: { bookmarks: v.array(v.any()), migrationSecret: v.string() },
  returns: v.array(idMapEntry),
  handler: async (ctx, { bookmarks, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    const result: { legacyId: string; convexId: string }[] = [];

    for (const bm of bookmarks) {
      const legacyId = normalizeText(bm.id)?.trim();
      const userId = normalizeText(bm.userId)?.trim();
      const url = normalizeText(bm.url)?.trim();
      if (!legacyId || !userId || !url) continue;

      const bookmarkFields = {
        userId,
        legacyId,
        url,
        type: bm.type ?? undefined,
        title: bm.title ?? undefined,
        summary: bm.summary ?? undefined,
        note: bm.note ?? undefined,
        preview: bm.preview ?? undefined,
        vectorSummary: bm.vectorSummary ?? undefined,
        faviconUrl: bm.faviconUrl ?? undefined,
        ogImageUrl: bm.ogImageUrl ?? undefined,
        ogDescription: bm.ogDescription ?? undefined,
        imageDescription: bm.imageDescription ?? undefined,
        metadata: bm.metadata ?? undefined,
        status: bm.status as string as
          | "PENDING"
          | "PROCESSING"
          | "READY"
          | "ERROR",
        starred: Boolean(bm.starred ?? false),
        read: Boolean(bm.read ?? false),
        // searchEmbedding and embeddingModel intentionally omitted — re-embed pass
        createdAt: toMs(bm.createdAt),
        updatedAt: toMs(bm.updatedAt),
      } as const;

      const existingByLegacyId = await (ctx.db.query("bookmarks") as any)
        .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", legacyId))
        .first();
      if (existingByLegacyId) {
        await ctx.db.patch(existingByLegacyId._id, bookmarkFields as any);
        result.push({ legacyId, convexId: existingByLegacyId._id as string });
        continue;
      }
      const existingByUserUrl = await (ctx.db.query("bookmarks") as any)
        .withIndex("by_user_url", (q: any) =>
          q.eq("userId", userId).eq("url", url),
        )
        .take(10);
      const existingWithoutLegacyId = existingByUserUrl.find(
        (row: { legacyId?: string | null }) => row.legacyId == null,
      );
      if (existingWithoutLegacyId) {
        await ctx.db.patch(existingWithoutLegacyId._id, bookmarkFields as any);
        result.push({
          legacyId,
          convexId: existingWithoutLegacyId._id as string,
        });
        continue;
      }

      const convexId = await ctx.db.insert("bookmarks", bookmarkFields as any);
      result.push({ legacyId, convexId: convexId as string });
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// 5. importBookmarkTags
// ---------------------------------------------------------------------------

/**
 * importBookmarkTags — inserts join rows.
 * Each row must have bookmarkId + tagId already rewritten to convex ids.
 *
 * Field mapping (Postgres "BookmarkTag" → Convex bookmarkTags):
 *   bookmarkId → bookmarkId (rewritten)
 *   tagId      → tagId (rewritten)
 *   userId     → userId (rewritten)
 */
export const importBookmarkTags = mutation({
  args: { rows: v.array(v.any()), migrationSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, { rows, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    for (const row of rows) {
      // Idempotent: skip if this (bookmarkId, tagId) join already exists.
      const existingJoins = await ctx.db
        .query("bookmarkTags")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_bookmark", (q: any) =>
          q.eq("bookmarkId", row.bookmarkId),
        )
        .take(500);
      if (existingJoins.some((j) => String(j.tagId) === String(row.tagId))) {
        continue;
      }
      await ctx.db.insert("bookmarkTags", {
        bookmarkId: row.bookmarkId as any,
        tagId: row.tagId as any,
        userId: String(row.userId),
      });
    }

    return rows.length;
  },
});

// ---------------------------------------------------------------------------
// 6. importBookmarkOpens
// ---------------------------------------------------------------------------

/**
 * importBookmarkOpens — inserts bookmark open events.
 * bookmarkId + userId already rewritten.
 *
 * Field mapping (Postgres "BookmarkOpen" → Convex bookmarkOpens):
 *   bookmarkId → bookmarkId (rewritten)
 *   userId     → userId (rewritten)
 *   openedAt   → openedAt (number ms); falls back to createdAt
 */
export const importBookmarkOpens = mutation({
  args: { rows: v.array(v.any()), migrationSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, { rows, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    for (const row of rows) {
      const bookmarkId = row.bookmarkId;
      const userId = String(row.userId);
      const openedAt = toMs(row.openedAt ?? row.createdAt);
      const existingOpens = await ctx.db
        .query("bookmarkOpens")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_bookmark_user", (q: any) =>
          q.eq("bookmarkId", bookmarkId).eq("userId", userId),
        )
        .take(500);
      if (existingOpens.some((open) => open.openedAt === openedAt)) {
        continue;
      }
      await ctx.db.insert("bookmarkOpens", {
        bookmarkId: bookmarkId as any,
        userId,
        openedAt,
      });
    }

    return rows.length;
  },
});

// ---------------------------------------------------------------------------
// 7. importSubscriptions
// ---------------------------------------------------------------------------

/**
 * importSubscriptions — inserts subscription rows.
 * userId already rewritten.
 *
 * Field mapping (Postgres subscription → Convex subscriptions):
 *   id                    → (auto-generated)
 *   userId (referenceId)  → userId (rewritten)
 *   plan                  → plan ("free" | "pro")
 *   stripeCustomerId      → stripeCustomerId
 *   stripeSubscriptionId  → stripeSubscriptionId
 *   status                → status
 *   currentPeriodStart    → periodStart (number ms)
 *   currentPeriodEnd      → periodEnd (number ms)
 *   cancelAtPeriodEnd     → cancelAtPeriodEnd
 *   seats                 → seats
 *   createdAt             → createdAt (number ms)
 *   updatedAt             → updatedAt (number ms)
 */
export const importSubscriptions = mutation({
  args: { rows: v.array(v.any()), migrationSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, { rows, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    for (const row of rows) {
      const userId = String(row.userId ?? row.referenceId);
      const stripeCustomerId =
        row.stripeCustomerId != null ? String(row.stripeCustomerId) : null;
      const stripeSubscriptionId =
        row.stripeSubscriptionId != null
          ? String(row.stripeSubscriptionId)
          : null;
      const subscription: {
        userId: string;
        plan: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        status?: string;
        periodStart?: number;
        periodEnd?: number;
        cancelAtPeriodEnd?: boolean;
        seats?: number;
        createdAt: number;
        updatedAt: number;
      } = {
        userId,
        plan: String(row.plan ?? "free"),
        createdAt: toMs(row.createdAt),
        updatedAt: toMs(row.updatedAt),
      };
      if (stripeCustomerId) {
        subscription.stripeCustomerId = stripeCustomerId;
      }
      if (stripeSubscriptionId) {
        subscription.stripeSubscriptionId = stripeSubscriptionId;
      }
      if (row.status != null) {
        subscription.status = String(row.status);
      }
      if (row.currentPeriodStart != null || row.periodStart != null) {
        subscription.periodStart =
          row.currentPeriodStart != null
            ? toMs(row.currentPeriodStart)
            : toMs(row.periodStart);
      }
      if (row.currentPeriodEnd != null || row.periodEnd != null) {
        subscription.periodEnd =
          row.currentPeriodEnd != null
            ? toMs(row.currentPeriodEnd)
            : toMs(row.periodEnd);
      }
      if (row.cancelAtPeriodEnd != null) {
        subscription.cancelAtPeriodEnd = normalizeBoolean(
          row.cancelAtPeriodEnd,
          false,
        );
      }
      if (row.seats != null) {
        subscription.seats = normalizeNumber(row.seats) ?? undefined;
      }

      const existingByStripeId = stripeSubscriptionId
        ? await ctx.db
            .query("subscriptions")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .withIndex("by_stripe_subscription", (q: any) =>
              q.eq("stripeSubscriptionId", stripeSubscriptionId),
            )
            .first()
        : null;
      const existingByUser =
        existingByStripeId ??
        (await ctx.db
          .query("subscriptions")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_user", (q: any) => q.eq("userId", userId))
          .first());

      if (existingByUser) {
        await ctx.db.patch(existingByUser._id, {
          ...(subscription as any),
        });
      } else {
        await ctx.db.insert("subscriptions", subscription as any);
      }
    }

    return rows.length;
  },
});

// ---------------------------------------------------------------------------
// 8. importConversations
// ---------------------------------------------------------------------------

/**
 * importConversations — inserts chat conversations + their messages.
 * userId already rewritten. Each element has an optional `_messages` array.
 *
 * Field mapping (Postgres "ChatConversation" → Convex chatConversations):
 *   id        → (auto-generated)
 *   userId    → userId (rewritten)
 *   title     → title
 *   likes     → likes (default 0)
 *   createdAt → createdAt (number ms)
 *   updatedAt → updatedAt (number ms)
 *   messages  → inserted as individual chatMessages rows
 *
 * chatMessages field mapping (from the JSON messages array on the conversation):
 *   role    → role ("user" | "assistant" | "system")
 *   content → content (v.any() — the full AI SDK UIMessage)
 *   createdAt → createdAt (number ms; falls back to conversation.createdAt)
 */
export const importConversations = mutation({
  args: { rows: v.array(v.any()), migrationSecret: v.string() },
  returns: v.number(),
  handler: async (ctx, { rows, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    let count = 0;

    for (const row of rows) {
      const userId = String(row.userId);
      const updatedAt = toMs(row.updatedAt);
      const title = row.title ?? undefined;
      // Idempotent: reuse a conversation with the same (userId, updatedAt, title)
      // so a re-run after a partial failure can still fill missing messages.
      const existing = await ctx.db
        .query("chatConversations")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_user_updated", (q: any) =>
          q.eq("userId", userId).eq("updatedAt", updatedAt),
        )
        .take(25);
      const existingConversation = existing.find(
        (c) => (c.title ?? undefined) === title,
      );
      const convexConversationId =
        existingConversation?._id ??
        (await ctx.db.insert("chatConversations", {
          userId,
          title,
          likes: Number(row.likes ?? 0),
          createdAt: toMs(row.createdAt),
          updatedAt,
        }));
      if (!existingConversation) count++;

      const existingMessages = await ctx.db
        .query("chatMessages")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_conversation", (q: any) =>
          q.eq("conversationId", convexConversationId),
        )
        .take(500);
      const existingMessageKeys = new Set(
        existingMessages.map(
          (msg) =>
            `${msg.role}:${msg.createdAt}:${stableJson(msg.content).slice(0, 500)}`,
        ),
      );

      // messages can be stored as JSON array on the Postgres row (old schema).
      const messages: unknown[] = Array.isArray(row._messages)
        ? row._messages
        : Array.isArray(row.messages)
          ? row.messages
          : [];

      for (const msg of messages) {
        const m = msg as Record<string, unknown>;
        const role = (m.role as string) ?? "user";
        const validRole =
          role === "assistant" || role === "system" ? role : "user";
        const content = m.content ?? m;
        const createdAt =
          m.createdAt != null
            ? toMs(m.createdAt as any)
            : toMs(row.createdAt);
        const messageKey = `${validRole}:${createdAt}:${stableJson(
          content,
        ).slice(0, 500)}`;
        if (existingMessageKeys.has(messageKey)) {
          continue;
        }
        // Convex documents are capped at 1 MiB. A few legacy messages embed huge
        // tool results / pasted blobs that exceed that on their own — skip them
        // rather than aborting the whole conversation import.
        const approxSize = stableJson(content).length;
        if (approxSize > 1_000_000) {
          console.warn(
            `[migrate] skipping oversized chat message (${approxSize} bytes) in conversation ${convexConversationId}`,
          );
          continue;
        }
        await ctx.db.insert("chatMessages", {
          conversationId: convexConversationId,
          userId: String(row.userId),
          role: validRole as "user" | "assistant" | "system",
          content,
          createdAt,
        });
        existingMessageKeys.add(messageKey);
      }
    }

    return count;
  },
});

// ---------------------------------------------------------------------------
// 9. rebuildUserCounters
// ---------------------------------------------------------------------------

/**
 * rebuildUserCounters — upserts a userCounters row with a precomputed
 * bookmarkCount per userId. The count is computed client-side in the import
 * script from the exported bookmarks (counting inside a mutation would require
 * reading every bookmark doc, which blows Convex's per-query read limits for
 * power users). Monthly counters are reset to 0 (the migration is a fresh
 * start for the new deployment). Idempotent — safe to re-run.
 */
export const rebuildUserCounters = mutation({
  args: {
    counters: v.array(
      v.object({ userId: v.string(), bookmarkCount: v.number() }),
    ),
    migrationSecret: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, { counters, migrationSecret }) => {
    assertMigrationAllowed(migrationSecret);

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    for (const { userId, bookmarkCount } of counters) {
      const existing = await ctx.db
        .query("userCounters")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          bookmarkCount,
          monthKey,
          monthlyRuns: 0,
          monthlyChatQueries: 0,
        });
      } else {
        await ctx.db.insert("userCounters", {
          userId,
          bookmarkCount,
          monthKey,
          monthlyRuns: 0,
          monthlyChatQueries: 0,
        });
      }
    }

    return counters.length;
  },
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * toMs — normalise a Postgres timestamp (string/Date) or number to milliseconds.
 */
function toMs(value: string | number | Date | unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return isNaN(ms) ? Date.now() : ms;
  }
  return Date.now();
}
