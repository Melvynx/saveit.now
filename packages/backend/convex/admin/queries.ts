/**
 * admin/queries.ts — Admin-only read endpoints.
 * Default runtime (no "use node").
 *
 * All exports use the `adminQuery` builder which enforces `user.role === "admin"`
 * server-side via `requireAdmin`. Never trust a client-passed userId.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { adminQuery } from "../functions";
import {
  deriveEffectivePlan,
  getLimits,
  parseCustomLimits,
} from "../billing/plans";

// ---------------------------------------------------------------------------
// Overview (dashboard)
// ---------------------------------------------------------------------------

/**
 * getOverview — returns aggregate stats for the admin dashboard.
 * Reads only bounded user/subscription counters — safe.
 */
export const getOverview = adminQuery({
  args: {},
  handler: async (ctx) => {
    // Fetch all users (bounded by MAX_AUTH_ROWS=500 in betterAuth component).
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersForAdmin,
      { limit: 500, sort: "desc" },
    );

    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.banned !== true).length;
    const bannedUsers = users.filter((u: any) => u.banned === true).length;
    const adminUsers = users.filter((u: any) => u.role === "admin").length;
    const marketingEligibleUsers = users.filter(
      (u: any) => u.unsubscribed !== true && u.email,
    ).length;

    // Count premium users via subscriptions table (bounded by index scan).
    const subscriptions = await ctx.db.query("subscriptions").take(500);
    const activeSubs = subscriptions.filter(
      (subscription) => deriveEffectivePlan(subscription) === "pro",
    );

    const premiumUserIds = new Set(activeSubs.map((s) => s.userId));
    const premiumUsers = users.filter((u: any) =>
      premiumUserIds.has(u._id as string),
    ).length;
    const regularUsers = Math.max(totalUsers - premiumUsers, 0);

    // Total bookmarks from userCounters (denormalized).
    const allCounters = await ctx.db.query("userCounters").take(500);
    const totalBookmarks = allCounters.reduce(
      (sum, c) => sum + (c.bookmarkCount ?? 0),
      0,
    );

    // Total clicks from bookmarkOpens — take bounded count.
    const totalClicks = await ctx.db.query("bookmarkOpens").take(500);

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      premiumUsers,
      regularUsers,
      totalBookmarks,
      totalClicks: totalClicks.length,
      marketingEligibleUsers,
    };
  },
});

// ---------------------------------------------------------------------------
// User list
// ---------------------------------------------------------------------------

/**
 * listUsers — paginated user list with filtering for the admin panel.
 */
export const listUsers = adminQuery({
  args: {
    page: v.number(),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("createdAt"),
        v.literal("name"),
        v.literal("bookmarks"),
        v.literal("clicks"),
      ),
    ),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("premium"), v.literal("regular")),
    ),
    status: v.optional(
      v.union(v.literal("all"), v.literal("active"), v.literal("banned")),
    ),
    role: v.optional(
      v.union(v.literal("all"), v.literal("admin"), v.literal("user")),
    ),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.pageSize ?? 10, 50);
    const page = Math.max(args.page ?? 1, 1);

    const sort = (args.order ?? "desc") as "asc" | "desc";

    // Fetch all users (bounded).
    let users = (await ctx.runQuery(
      components.betterAuth.data.listUsersForAdmin,
      {
        limit: 500,
        sort,
        search: args.search || undefined,
        role:
          args.role && args.role !== "all"
            ? (args.role as "admin" | "user")
            : undefined,
        status:
          args.status && args.status !== "all"
            ? (args.status as "active" | "banned")
            : undefined,
      },
    )) as any[];

    // Fetch subscriptions once for all users.
    const subscriptions = await ctx.db.query("subscriptions").take(500);
    const activeSubs = subscriptions.filter(
      (subscription) => deriveEffectivePlan(subscription) === "pro",
    );

    const subsByUser = new Map<string, typeof activeSubs>();
    for (const sub of activeSubs) {
      const existing = subsByUser.get(sub.userId) ?? [];
      existing.push(sub);
      subsByUser.set(sub.userId, existing);
    }

    // Filter by plan.
    if (args.filter === "premium") {
      users = users.filter(
        (u) => (subsByUser.get(u._id as string) ?? []).length > 0,
      );
    } else if (args.filter === "regular") {
      users = users.filter(
        (u) => (subsByUser.get(u._id as string) ?? []).length === 0,
      );
    }

    // Fetch counters for bookmark/click counts.
    const allCounters = await ctx.db.query("userCounters").take(500);
    const countersByUser = new Map(allCounters.map((c) => [c.userId, c]));

    const allBookmarkOpens = await ctx.db.query("bookmarkOpens").take(500);
    const clicksByUser = new Map<string, number>();
    for (const open of allBookmarkOpens) {
      clicksByUser.set(open.userId, (clicksByUser.get(open.userId) ?? 0) + 1);
    }

    // Enrich users with stats.
    const enriched = users.map((u) => {
      const counter = countersByUser.get(u._id as string);
      const subs = subsByUser.get(u._id as string) ?? [];
      return {
        id: u._id as string,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        banned: u.banned ?? null,
        banReason: u.banReason ?? null,
        emailVerified: u.emailVerified ?? false,
        createdAt: u.createdAt ?? 0,
        publicLinkEnabled: u.publicLinkEnabled ?? false,
        subscriptions: subs.map((s) => ({
          plan: s.plan,
          status: s.status ?? null,
          periodEnd: s.periodEnd ?? null,
        })),
        _count: {
          bookmarks: counter?.bookmarkCount ?? 0,
          bookmarkOpens: clicksByUser.get(u._id as string) ?? 0,
        },
      };
    });

    // Sort by field.
    if (args.sortBy === "name") {
      enriched.sort((a, b) => {
        const nameA = (a.name ?? "").toLowerCase();
        const nameB = (b.name ?? "").toLowerCase();
        return sort === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else if (args.sortBy === "bookmarks") {
      enriched.sort((a, b) =>
        sort === "asc"
          ? a._count.bookmarks - b._count.bookmarks
          : b._count.bookmarks - a._count.bookmarks,
      );
    } else if (args.sortBy === "clicks") {
      enriched.sort((a, b) =>
        sort === "asc"
          ? a._count.bookmarkOpens - b._count.bookmarkOpens
          : b._count.bookmarkOpens - a._count.bookmarkOpens,
      );
    }
    // createdAt is already sorted by betterAuth listUsersForAdmin.

    const total = enriched.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginated = enriched.slice(offset, offset + pageSize);

    return {
      users: paginated,
      total,
      totalPages,
    };
  },
});

// ---------------------------------------------------------------------------
// User detail
// ---------------------------------------------------------------------------

/**
 * getUserDetail — single user with subscription, limits and usage stats.
 */
export const getUserDetail = adminQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userData = (await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: args.userId },
    )) as any;

    if (!userData) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const plan = deriveEffectivePlan(subscription);

    const metadata = userData.metadata;
    const baseLimits = getLimits(plan);
    const customLimits = parseCustomLimits(metadata);
    const effectiveLimits = getLimits(plan, metadata);

    const counter = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const clickRows = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q) => q.eq("userId", args.userId))
      .take(500);

    return {
      id: userData._id as string,
      name: userData.name ?? null,
      email: userData.email ?? null,
      role: userData.role ?? null,
      banned: userData.banned ?? null,
      banReason: userData.banReason ?? null,
      emailVerified: userData.emailVerified ?? false,
      createdAt: userData.createdAt ?? 0,
      publicLinkEnabled: userData.publicLinkEnabled ?? false,
      metadata: userData.metadata ?? null,
      bookmarkCount: counter?.bookmarkCount ?? 0,
      clickCount: clickRows.length,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status ?? null,
            periodEnd: subscription.periodEnd ?? null,
          }
        : null,
      baseLimits,
      customLimits,
      effectiveLimits,
    };
  },
});

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/**
 * listConversations — conversations that received positive or negative feedback.
 */
export const listConversations = adminQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("chatConversations").take(500);
    const withFeedback = all
      .filter((c) => c.likes !== 0)
      .sort((a, b) => b.likes - a.likes);

    // Enrich with user info.
    const enriched = await Promise.all(
      withFeedback.map(async (c) => {
        const user = (await ctx.runQuery(
          components.betterAuth.data.getUserById,
          { userId: c.userId },
        )) as any;

        return {
          id: c._id as string,
          title: c.title ?? null,
          likes: c.likes,
          updatedAt: c.updatedAt,
          user: {
            name: user?.name ?? "Unknown",
            email: user?.email ?? "unknown@email.com",
          },
        };
      }),
    );

    return enriched;
  },
});

/**
 * getConversation — single conversation with all messages for admin review.
 */
export const getConversation = adminQuery({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    // Normalize conversationId — it might come as a plain string from the route param.
    const id = ctx.db.normalizeId("chatConversations", args.conversationId);
    if (!id) return null;

    const conversation = await ctx.db.get(id);
    if (!conversation) return null;

    const messageRows = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", id))
      .order("asc")
      .collect();

    const user = (await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: conversation.userId,
    })) as any;

    return {
      id: conversation._id as string,
      title: conversation.title ?? null,
      likes: conversation.likes,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      user: {
        name: user?.name ?? "Unknown",
        email: user?.email ?? "unknown@email.com",
      },
      messages: messageRows.map((row) => row.content),
    };
  },
});

// ---------------------------------------------------------------------------
// Marketing stats
// ---------------------------------------------------------------------------

/**
 * getMarketingStats — count of eligible users for broadcast email.
 */
export const getMarketingStats = adminQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersForAdmin,
      { limit: 500, sort: "desc" },
    );

    const eligibleUsersCount = (users as any[]).filter(
      (u) => u.email && u.unsubscribed !== true,
    ).length;

    return { eligibleUsersCount };
  },
});
