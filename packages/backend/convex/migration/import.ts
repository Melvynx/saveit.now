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
 *   2. importTags        — tags (userId already rewritten)
 *   3. importBookmarks   — bookmarks (userId rewritten, embeddings omitted)
 *   4. importBookmarkTags
 *   5. importBookmarkOpens
 *   6. importSubscriptions
 *   7. importConversations  (conversations + messages)
 *   8. rebuildUserCounters
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../functions";
import { throwForbidden } from "../utils/errors";

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

function assertMigrationAllowed(): void {
  if (process.env.ALLOW_MIGRATION !== "true") {
    throwForbidden("Migration not enabled");
  }
}

// ---------------------------------------------------------------------------
// Return type shared by import helpers
// ---------------------------------------------------------------------------

const idMapEntry = v.object({ legacyId: v.string(), convexId: v.string() });

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
  args: { users: v.array(v.any()) },
  returns: v.array(idMapEntry),
  handler: async (ctx, { users }) => {
    assertMigrationAllowed();

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
// 2. importTags
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
  args: { tags: v.array(v.any()) },
  returns: v.array(idMapEntry),
  handler: async (ctx, { tags }) => {
    assertMigrationAllowed();

    const result: { legacyId: string; convexId: string }[] = [];

    for (const tag of tags) {
      const legacyId = String(tag.id);
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
// 3. importBookmarks
// ---------------------------------------------------------------------------

/**
 * importBookmarks — inserts bookmark rows.
 * searchEmbedding / embeddingModel are NOT imported — the reembed pass fills them.
 * userId is already rewritten by the script.
 *
 * Field mapping (Postgres "Bookmark" → Convex bookmarks):
 *   id                → (auto-generated)
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
  args: { bookmarks: v.array(v.any()) },
  returns: v.array(idMapEntry),
  handler: async (ctx, { bookmarks }) => {
    assertMigrationAllowed();

    const result: { legacyId: string; convexId: string }[] = [];

    for (const bm of bookmarks) {
      const legacyId = String(bm.id);
      const convexId = await ctx.db.insert("bookmarks", {
        userId: String(bm.userId),
        url: String(bm.url),
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
        status: (bm.status as string) as
          | "PENDING"
          | "PROCESSING"
          | "READY"
          | "ERROR",
        starred: Boolean(bm.starred ?? false),
        read: Boolean(bm.read ?? false),
        // searchEmbedding and embeddingModel intentionally omitted — re-embed pass
        createdAt: toMs(bm.createdAt),
        updatedAt: toMs(bm.updatedAt),
      });
      result.push({ legacyId, convexId: convexId as string });
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// 4. importBookmarkTags
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
  args: { rows: v.array(v.any()) },
  returns: v.number(),
  handler: async (ctx, { rows }) => {
    assertMigrationAllowed();

    for (const row of rows) {
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
// 5. importBookmarkOpens
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
  args: { rows: v.array(v.any()) },
  returns: v.number(),
  handler: async (ctx, { rows }) => {
    assertMigrationAllowed();

    for (const row of rows) {
      await ctx.db.insert("bookmarkOpens", {
        bookmarkId: row.bookmarkId as any,
        userId: String(row.userId),
        openedAt: toMs(row.openedAt ?? row.createdAt),
      });
    }

    return rows.length;
  },
});

// ---------------------------------------------------------------------------
// 6. importSubscriptions
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
  args: { rows: v.array(v.any()) },
  returns: v.number(),
  handler: async (ctx, { rows }) => {
    assertMigrationAllowed();

    for (const row of rows) {
      await ctx.db.insert("subscriptions", {
        userId: String(row.userId ?? row.referenceId),
        plan: String(row.plan ?? "free"),
        stripeCustomerId: row.stripeCustomerId ?? undefined,
        stripeSubscriptionId: row.stripeSubscriptionId ?? undefined,
        status: row.status ?? undefined,
        periodStart:
          row.currentPeriodStart != null
            ? toMs(row.currentPeriodStart)
            : row.periodStart != null
              ? toMs(row.periodStart)
              : undefined,
        periodEnd:
          row.currentPeriodEnd != null
            ? toMs(row.currentPeriodEnd)
            : row.periodEnd != null
              ? toMs(row.periodEnd)
              : undefined,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? undefined,
        seats: row.seats ?? undefined,
        createdAt: toMs(row.createdAt),
        updatedAt: toMs(row.updatedAt),
      });
    }

    return rows.length;
  },
});

// ---------------------------------------------------------------------------
// 7. importConversations
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
  args: { rows: v.array(v.any()) },
  returns: v.number(),
  handler: async (ctx, { rows }) => {
    assertMigrationAllowed();

    let count = 0;

    for (const row of rows) {
      const convexConversationId = await ctx.db.insert("chatConversations", {
        userId: String(row.userId),
        title: row.title ?? undefined,
        likes: Number(row.likes ?? 0),
        createdAt: toMs(row.createdAt),
        updatedAt: toMs(row.updatedAt),
      });
      count++;

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
        await ctx.db.insert("chatMessages", {
          conversationId: convexConversationId,
          userId: String(row.userId),
          role: validRole as "user" | "assistant" | "system",
          content: m.content ?? m,
          createdAt: m.createdAt != null ? toMs(m.createdAt as any) : toMs(row.createdAt),
        });
      }
    }

    return count;
  },
});

// ---------------------------------------------------------------------------
// 8. rebuildUserCounters
// ---------------------------------------------------------------------------

/**
 * rebuildUserCounters — recomputes the denormalized bookmarkCount for each userId
 * and upserts a userCounters row. Monthly counters are reset to 0 (the migration
 * is a fresh start for the new deployment).
 *
 * Called once at the end of the import with all convex userIds.
 */
export const rebuildUserCounters = mutation({
  args: { userIds: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, { userIds }) => {
    assertMigrationAllowed();

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    for (const userId of userIds) {
      // Count bookmarks via bounded index read.
      // We read in chunks of 1000 to stay within Convex read limits.
      let bookmarkCount = 0;
      let cursor: string | null = null;

      while (true) {
        const page = await ctx.db
          .query("bookmarks")
          .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
          .paginate({ cursor, numItems: 1000 });

        bookmarkCount += page.page.length;

        if (page.isDone) break;
        cursor = page.continueCursor;
      }

      const existing = await ctx.db
        .query("userCounters")
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

    return userIds.length;
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
