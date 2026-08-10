/**
 * admin/queries.ts — Admin-only read endpoints.
 * Default runtime (no "use node").
 *
 * All exports use the `adminQuery` builder which enforces `user.role === "admin"`
 * server-side via `requireAdmin`. Never trust a client-passed userId.
 *
 * Read-budget policy: Convex has no count operator and a per-query document
 * read ceiling, so every scan here is explicitly bounded by a named constant
 * and reports a `capped` flag when it hits the bound. A capped number is
 * labelled in the UI ("500+") rather than silently presented as a total.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import { adminQuery } from "../functions";
import {
  deriveEffectivePlan,
  getLimits,
  parseCustomLimits,
  pickCanonicalSubscription,
  type SubscriptionPlanState,
} from "../billing/plans";

// ---------------------------------------------------------------------------
// Scan bounds
// ---------------------------------------------------------------------------

/** betterAuth caps this at MAX_AUTH_ROWS=500 internally. */
const USER_SCAN_LIMIT = 500;
const SUBSCRIPTION_SCAN_LIMIT = 500;
/**
 * Platform-wide bound for the aggregate counter reads (`getOverview`,
 * `getTopUsers`). A `userCounters` row is five scalars (~150 bytes) and there is
 * exactly one per user who has ever saved a bookmark, so 10k rows costs ~1.5 MB
 * of the 16 MB read budget — cheap enough that these numbers can be real totals
 * instead of an arbitrary slice.
 *
 * `listUsers` deliberately does NOT use this: it looks counters up per user
 * through `by_user`, which stays exact however far the table grows.
 */
const COUNTER_SCAN_LIMIT = 10_000;
/** Newest-first slice of bookmarkOpens used for "recent clicks" everywhere. */
const RECENT_OPENS_LIMIT = 5000;
/**
 * Newest-first slice of bookmarkProcessingRuns used for the platform-wide
 * "bookmarks saved" metric and series.
 *
 * A `bookmarks` document carries a 1536-float `searchEmbedding` (~15 KB each),
 * so bulk-reading that table blows Convex's 16 MB per-execution read budget
 * long before it returns a useful window. `bookmarkProcessingRuns` records one
 * row per ingestion at ~150 bytes, so it buys a 100× wider window for a
 * fraction of the budget. Runs are deduped by bookmarkId below so a retried
 * ingestion still counts as one bookmark.
 */
const BOOKMARK_RUN_ACTIVITY_LIMIT = 5000;
/**
 * Per-user bookmark reads pay the same embedding cost, so this stays small.
 * 200 docs ≈ 3 MB; the UI shows a "capped" notice past it.
 */
const USER_BOOKMARK_LIMIT = 200;
const USER_OPEN_LIMIT = 2000;
const USER_TAG_LIMIT = 200;
const USER_CONVERSATION_LIMIT = 50;
const CONVERSATION_SCAN_LIMIT = 500;
const CONVERSATION_MESSAGE_LIMIT = 500;

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES_DAYS = 30;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * The betterAuth `user` row as seen from the app side. Declared locally because
 * the component's generated types are not re-exported to app functions.
 */
type AuthUser = {
  _id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: number | null;
  emailVerified?: boolean;
  createdAt?: number;
  updatedAt?: number;
  publicLinkEnabled?: boolean;
  publicLinkSlug?: string | null;
  onboarding?: boolean;
  unsubscribed?: boolean;
  stripeCustomerId?: string | null;
  metadata?: unknown;
};

export type ActivityEventType =
  | "signup"
  | "subscription"
  | "bookmark"
  | "feedback"
  | "open"
  | "conversation";

type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  at: number;
  title: string;
  subtitle: string | null;
  userId: string | null;
  userName: string | null;
  meta: string | null;
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

const dayKey = (timestamp: number) =>
  new Date(timestamp).toISOString().slice(0, 10);

const startOfUtcDay = (timestamp: number) =>
  Math.floor(timestamp / DAY_MS) * DAY_MS;

/** Daily counts for the last `days` days, oldest first, zero-filled. */
function buildDailySeries(timestamps: number[], days: number, now: number) {
  const from = startOfUtcDay(now) - (days - 1) * DAY_MS;
  const buckets = new Map<string, number>();

  for (let index = 0; index < days; index += 1) {
    buckets.set(dayKey(from + index * DAY_MS), 0);
  }

  for (const timestamp of timestamps) {
    if (timestamp < from) continue;
    const key = dayKey(timestamp);
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + 1);
  }

  return Array.from(buckets, ([date, value]) => ({ date, value }));
}

const countInWindow = (timestamps: number[], from: number, to: number) =>
  timestamps.reduce(
    (total, timestamp) =>
      timestamp >= from && timestamp < to ? total + 1 : total,
    0,
  );

/** Percentage change vs the previous window; null when there is no baseline. */
const trendPercent = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100);

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/**
 * A user can own several subscription rows: cancelling and re-subscribing
 * inserts a new one rather than mutating the old, so `.first()` on the
 * `by_user` index returns the *oldest* — usually a dead row.
 */
const SUBSCRIPTION_PER_USER_LIMIT = 20;

/**
 * Newest-first on purpose. Convex's default order is oldest-first, so once the
 * table outgrows SUBSCRIPTION_SCAN_LIMIT a default scan would retain mostly
 * long-cancelled rows and quietly report paying customers as free — everywhere
 * at once, since the dashboard's plan mix and the user list both read this.
 */
const fetchRecentSubscriptions = (ctx: QueryCtx) =>
  ctx.db.query("subscriptions").order("desc").take(SUBSCRIPTION_SCAN_LIMIT);

async function fetchAdminUsers(
  ctx: QueryCtx,
  args: {
    limit?: number;
    sort?: "asc" | "desc";
    search?: string;
    role?: "admin" | "user";
    status?: "active" | "banned";
  } = {},
): Promise<AuthUser[]> {
  const rows = await ctx.runQuery(
    components.betterAuth.data.listUsersForAdmin,
    {
      limit: args.limit ?? USER_SCAN_LIMIT,
      sort: args.sort ?? "desc",
      search: args.search,
      role: args.role,
      status: args.status,
    },
  );

  return rows as unknown as AuthUser[];
}

async function fetchUsersByIds(
  ctx: QueryCtx,
  userIds: string[],
): Promise<Map<string, AuthUser>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const rows = (await ctx.runQuery(components.betterAuth.data.listUsersByIds, {
    userIds: unique,
  })) as unknown as AuthUser[];

  return new Map(rows.map((row) => [row._id, row]));
}

const displayName = (user: AuthUser | undefined, fallback: string) =>
  user?.name || user?.email || fallback;

const currentMonthKey = (now: number) => new Date(now).toISOString().slice(0, 7);

// ---------------------------------------------------------------------------
// Overview (dashboard)
// ---------------------------------------------------------------------------

/**
 * getOverview — platform KPIs, growth trends and 30-day series for the
 * admin dashboard. Every read is bounded; `scan` reports what was capped.
 */
export const getOverview = adminQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await fetchAdminUsers(ctx);

    const totalUsers = users.length;
    const bannedUsers = users.filter((user) => user.banned === true).length;
    const adminUsers = users.filter((user) => user.role === "admin").length;
    const verifiedUsers = users.filter(
      (user) => user.emailVerified === true,
    ).length;
    const activeUsers = totalUsers - bannedUsers;

    const subscriptions = await fetchRecentSubscriptions(ctx);
    const proSubscriptions = subscriptions.filter(
      (subscription) => deriveEffectivePlan(subscription) === "pro",
    );
    const proUserIds = new Set(proSubscriptions.map((s) => s.userId));
    const premiumUsers = users.filter((user) =>
      proUserIds.has(user._id),
    ).length;
    const regularUsers = Math.max(totalUsers - premiumUsers, 0);
    const lifetimeUsers = proSubscriptions.filter(
      (subscription) => subscription.provider === "manual",
    ).length;

    const counters = await ctx.db.query("userCounters").take(COUNTER_SCAN_LIMIT);
    const monthKey = currentMonthKey(now);
    const monthCounters = counters.filter(
      (counter) => counter.monthKey === monthKey,
    );

    const totalBookmarks = counters.reduce(
      (sum, counter) => sum + (counter.bookmarkCount ?? 0),
      0,
    );
    const savers = counters.filter(
      (counter) => (counter.bookmarkCount ?? 0) > 0,
    ).length;
    const monthlyRuns = monthCounters.reduce(
      (sum, counter) => sum + (counter.monthlyRuns ?? 0),
      0,
    );
    const monthlyChatQueries = monthCounters.reduce(
      (sum, counter) => sum + (counter.monthlyChatQueries ?? 0),
      0,
    );
    const activeThisMonth = monthCounters.filter(
      (counter) => (counter.monthlyRuns ?? 0) + (counter.monthlyChatQueries ?? 0) > 0,
    ).length;

    // Newest-first so this is genuinely "recent activity", not an arbitrary
    // oldest-N slice (which is what the previous implementation returned).
    const recentOpens = await ctx.db
      .query("bookmarkOpens")
      .order("desc")
      .take(RECENT_OPENS_LIMIT);

    // One row per ingestion, ~150 bytes each — see BOOKMARK_RUN_ACTIVITY_LIMIT.
    const bookmarkRuns = await ctx.db
      .query("bookmarkProcessingRuns")
      .order("desc")
      .take(BOOKMARK_RUN_ACTIVITY_LIMIT);

    // Dedupe retries: keep the earliest run per bookmark, which is the moment
    // the bookmark was actually saved.
    const firstRunByBookmark = new Map<string, number>();
    for (const run of bookmarkRuns) {
      const previous = firstRunByBookmark.get(run.bookmarkId);
      if (previous === undefined || run.startedAt < previous) {
        firstRunByBookmark.set(run.bookmarkId, run.startedAt);
      }
    }

    const signupTimestamps = users.map((user) => user.createdAt ?? 0);
    const bookmarkTimestamps = [...firstRunByBookmark.values()];
    const openTimestamps = recentOpens.map((open) => open.openedAt);

    const day7 = now - 7 * DAY_MS;
    const day14 = now - 14 * DAY_MS;
    const day30 = now - 30 * DAY_MS;
    const day60 = now - 60 * DAY_MS;

    const newUsers7d = countInWindow(signupTimestamps, day7, now);
    const newUsers7dPrevious = countInWindow(signupTimestamps, day14, day7);
    const newUsers30d = countInWindow(signupTimestamps, day30, now);
    const newUsers30dPrevious = countInWindow(signupTimestamps, day60, day30);

    const bookmarks7d = countInWindow(bookmarkTimestamps, day7, now);
    const bookmarks7dPrevious = countInWindow(bookmarkTimestamps, day14, day7);

    const clicks7d = countInWindow(openTimestamps, day7, now);
    const clicks7dPrevious = countInWindow(openTimestamps, day14, day7);

    return {
      generatedAt: now,
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        admins: adminUsers,
        verified: verifiedUsers,
        unverified: Math.max(totalUsers - verifiedUsers, 0),
      },
      plans: {
        premium: premiumUsers,
        regular: regularUsers,
        lifetime: lifetimeUsers,
        conversionRate:
          totalUsers === 0
            ? 0
            : Math.round((premiumUsers / totalUsers) * 1000) / 10,
      },
      content: {
        totalBookmarks,
        // Users who have ever saved something: a `userCounters` row is inserted
        // on first save, never at signup, so this is a real activation number.
        savers,
        // Divided by savers, not by `totalUsers`. betterAuth hard-caps the user
        // scan at 500 while the counter scan covers the whole table, so those
        // two populations are different sizes and their ratio means nothing.
        averagePerSaver:
          savers === 0 ? 0 : Math.round((totalBookmarks / savers) * 10) / 10,
      },
      usage: {
        monthKey,
        monthlyRuns,
        monthlyChatQueries,
        activeThisMonth,
      },
      growth: {
        newUsers7d,
        newUsers7dTrend: trendPercent(newUsers7d, newUsers7dPrevious),
        newUsers30d,
        newUsers30dTrend: trendPercent(newUsers30d, newUsers30dPrevious),
        bookmarks7d,
        bookmarks7dTrend: trendPercent(bookmarks7d, bookmarks7dPrevious),
        clicks7d,
        clicks7dTrend: trendPercent(clicks7d, clicks7dPrevious),
      },
      series: {
        signups: buildDailySeries(signupTimestamps, SERIES_DAYS, now),
        bookmarks: buildDailySeries(bookmarkTimestamps, SERIES_DAYS, now),
        clicks: buildDailySeries(openTimestamps, SERIES_DAYS, now),
      },
      scan: {
        usersCapped: totalUsers >= USER_SCAN_LIMIT,
        userLimit: USER_SCAN_LIMIT,
        bookmarksCapped: bookmarkRuns.length >= BOOKMARK_RUN_ACTIVITY_LIMIT,
        // Ship the bounds alongside the flags so the UI never has to restate
        // them — a hardcoded copy in the client silently lies the moment a
        // constant here changes.
        bookmarkLimit: BOOKMARK_RUN_ACTIVITY_LIMIT,
        clicksCapped: recentOpens.length >= RECENT_OPENS_LIMIT,
        clickLimit: RECENT_OPENS_LIMIT,
        // `totalBookmarks` sums this scan, so a capped one makes it a floor.
        countersCapped: counters.length >= COUNTER_SCAN_LIMIT,
        counterLimit: COUNTER_SCAN_LIMIT,
        clicksSince:
          recentOpens.length > 0
            ? (recentOpens[recentOpens.length - 1]?.openedAt ?? null)
            : null,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Recent activity feed
// ---------------------------------------------------------------------------

/**
 * getRecentActivity — merged platform timeline (signups, upgrades, bookmarks,
 * conversation feedback), newest first.
 */
export const getRecentActivity = adminQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 20), 1), 50);
    const perSource = Math.min(limit, 20);
    const events: ActivityEvent[] = [];

    const users = await fetchAdminUsers(ctx, { limit: USER_SCAN_LIMIT });
    const usersById = new Map(users.map((user) => [user._id, user]));

    for (const user of users.slice(0, perSource)) {
      events.push({
        id: `signup:${user._id}`,
        type: "signup",
        at: user.createdAt ?? 0,
        title: displayName(user, user._id),
        subtitle: user.email ?? null,
        userId: user._id,
        userName: displayName(user, user._id),
        meta: user.emailVerified ? "verified" : "unverified",
      });
    }

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(perSource);
    const lifetimeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "lifetime"))
      .order("desc")
      .take(perSource);

    const subscriptionRows = [...activeSubscriptions, ...lifetimeSubscriptions];
    const missingSubscriptionUsers = subscriptionRows
      .map((subscription) => subscription.userId)
      .filter((userId) => !usersById.has(userId));
    const extraUsers = await fetchUsersByIds(ctx, missingSubscriptionUsers);
    for (const [userId, user] of extraUsers) usersById.set(userId, user);

    for (const subscription of subscriptionRows) {
      const user = usersById.get(subscription.userId);
      events.push({
        id: `subscription:${subscription._id}`,
        type: "subscription",
        at: subscription.createdAt ?? subscription._creationTime,
        title: displayName(user, subscription.userId),
        subtitle: user?.email ?? null,
        userId: subscription.userId,
        userName: displayName(user, subscription.userId),
        meta: `${subscription.plan}${
          subscription.provider ? ` · ${subscription.provider}` : ""
        }`,
      });
    }

    const readyBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "READY"))
      .order("desc")
      .take(perSource);

    const missingBookmarkUsers = readyBookmarks
      .map((bookmark) => bookmark.userId)
      .filter((userId) => !usersById.has(userId));
    const bookmarkUsers = await fetchUsersByIds(ctx, missingBookmarkUsers);
    for (const [userId, user] of bookmarkUsers) usersById.set(userId, user);

    for (const bookmark of readyBookmarks) {
      const user = usersById.get(bookmark.userId);
      events.push({
        id: `bookmark:${bookmark._id}`,
        type: "bookmark",
        at: bookmark.updatedAt,
        title: bookmark.title || bookmark.url,
        subtitle: bookmark.url,
        userId: bookmark.userId,
        userName: displayName(user, bookmark.userId),
        meta: bookmark.type ?? null,
      });
    }

    const conversations = await ctx.db
      .query("chatConversations")
      .take(CONVERSATION_SCAN_LIMIT);
    const feedbackConversations = conversations
      .filter((conversation) => conversation.likes !== 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, perSource);

    const missingConversationUsers = feedbackConversations
      .map((conversation) => conversation.userId)
      .filter((userId) => !usersById.has(userId));
    const conversationUsers = await fetchUsersByIds(
      ctx,
      missingConversationUsers,
    );
    for (const [userId, user] of conversationUsers) usersById.set(userId, user);

    for (const conversation of feedbackConversations) {
      const user = usersById.get(conversation.userId);
      events.push({
        id: `feedback:${conversation._id}`,
        type: "feedback",
        at: conversation.updatedAt,
        title: conversation.title || "Untitled conversation",
        subtitle: user?.email ?? null,
        userId: conversation.userId,
        userName: displayName(user, conversation.userId),
        meta: conversation.likes > 0 ? `+${conversation.likes}` : `${conversation.likes}`,
      });
    }

    return events.sort((a, b) => b.at - a.at).slice(0, limit);
  },
});

// ---------------------------------------------------------------------------
// Top users
// ---------------------------------------------------------------------------

/**
 * getTopUsers — highest bookmark counts, from the denormalized userCounters.
 * Ranked over the whole counter table (see COUNTER_SCAN_LIMIT), so this is a
 * real leaderboard and not the top of an arbitrary slice.
 */
export const getTopUsers = adminQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 8), 1), 25);

    const counters = await ctx.db.query("userCounters").take(COUNTER_SCAN_LIMIT);
    const ranked = counters
      .filter((counter) => (counter.bookmarkCount ?? 0) > 0)
      .sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0))
      .slice(0, limit);

    const usersById = await fetchUsersByIds(
      ctx,
      ranked.map((counter) => counter.userId),
    );

    const subscriptions = await fetchRecentSubscriptions(ctx);
    const proUserIds = new Set(
      subscriptions
        .filter((subscription) => deriveEffectivePlan(subscription) === "pro")
        .map((subscription) => subscription.userId),
    );

    return ranked.map((counter) => {
      const user = usersById.get(counter.userId);
      return {
        userId: counter.userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        banned: user?.banned ?? false,
        isPro: proUserIds.has(counter.userId),
        bookmarkCount: counter.bookmarkCount ?? 0,
        monthlyRuns: counter.monthlyRuns ?? 0,
        monthlyChatQueries: counter.monthlyChatQueries ?? 0,
      };
    });
  },
});

// ---------------------------------------------------------------------------
// User list
// ---------------------------------------------------------------------------

/**
 * listUsers — filtered, sorted, paginated user list for the admin panel.
 *
 * Click counts come from the newest `RECENT_OPENS_LIMIT` bookmark opens, so
 * they are "recent clicks" and are labelled as such in the UI. The previous
 * implementation read the *oldest* 500 opens and presented them as totals.
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
    const pageSize = Math.min(Math.max(args.pageSize ?? 25, 1), 50);
    const page = Math.max(args.page ?? 1, 1);
    const order = args.order ?? "desc";
    const sortBy = args.sortBy ?? "createdAt";

    // Always take the newest USER_SCAN_LIMIT rows so the candidate set does not
    // change when the user flips sort direction.
    let users = await fetchAdminUsers(ctx, {
      limit: USER_SCAN_LIMIT,
      sort: "desc",
      search: args.search || undefined,
      role: args.role && args.role !== "all" ? args.role : undefined,
      status: args.status && args.status !== "all" ? args.status : undefined,
    });

    const subscriptions = await fetchRecentSubscriptions(ctx);
    const proSubscriptionsByUser = new Map<
      string,
      (typeof subscriptions)[number][]
    >();
    for (const subscription of subscriptions) {
      if (deriveEffectivePlan(subscription) !== "pro") continue;
      const existing = proSubscriptionsByUser.get(subscription.userId) ?? [];
      existing.push(subscription);
      proSubscriptionsByUser.set(subscription.userId, existing);
    }

    if (args.filter === "premium") {
      users = users.filter((user) => proSubscriptionsByUser.has(user._id));
    } else if (args.filter === "regular") {
      users = users.filter((user) => !proSubscriptionsByUser.has(user._id));
    }

    // One indexed point lookup per candidate rather than a table scan. The scan
    // this replaces returned the *oldest* `userCounters` rows while
    // `fetchAdminUsers` returns the *newest* users; past ~500 savers the two
    // windows stop overlapping, so the Usage column showed "0 bookmarks" for
    // essentially every account and sorting by usage ranked a column of zeros.
    // Bounded by `users.length` (≤ USER_SCAN_LIMIT, and smaller once the search
    // and plan filters have run), so this is exact at any table size.
    const counterRows = await Promise.all(
      users.map((user) =>
        ctx.db
          .query("userCounters")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first(),
      ),
    );
    const countersByUser = new Map(
      counterRows.flatMap((counter) =>
        counter ? [[counter.userId, counter] as const] : [],
      ),
    );

    const recentOpens = await ctx.db
      .query("bookmarkOpens")
      .order("desc")
      .take(RECENT_OPENS_LIMIT);
    const clicksByUser = new Map<string, number>();
    for (const open of recentOpens) {
      clicksByUser.set(open.userId, (clicksByUser.get(open.userId) ?? 0) + 1);
    }

    const enriched = users.map((user) => {
      const counter = countersByUser.get(user._id);
      const userSubscriptions = proSubscriptionsByUser.get(user._id) ?? [];
      return {
        id: user._id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
        role: user.role ?? null,
        banned: user.banned ?? null,
        banReason: user.banReason ?? null,
        emailVerified: user.emailVerified ?? false,
        createdAt: user.createdAt ?? 0,
        publicLinkEnabled: user.publicLinkEnabled ?? false,
        hasCustomLimits:
          Object.keys(parseCustomLimits(user.metadata)).length > 0,
        subscriptions: userSubscriptions.map((subscription) => ({
          plan: subscription.plan,
          provider: subscription.provider ?? null,
          status: subscription.status ?? null,
          periodEnd: subscription.periodEnd ?? null,
        })),
        _count: {
          bookmarks: counter?.bookmarkCount ?? 0,
          bookmarkOpens: clicksByUser.get(user._id) ?? 0,
          monthlyRuns: counter?.monthlyRuns ?? 0,
          monthlyChatQueries: counter?.monthlyChatQueries ?? 0,
        },
      };
    });

    const direction = order === "asc" ? 1 : -1;
    enriched.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (
            direction *
            (a.name ?? a.email ?? "")
              .toLowerCase()
              .localeCompare((b.name ?? b.email ?? "").toLowerCase())
          );
        case "bookmarks":
          return direction * (a._count.bookmarks - b._count.bookmarks);
        case "clicks":
          return direction * (a._count.bookmarkOpens - b._count.bookmarkOpens);
        default:
          return direction * (a.createdAt - b.createdAt);
      }
    });

    const total = enriched.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    return {
      users: enriched.slice(offset, offset + pageSize),
      total,
      totalPages,
      page: safePage,
      pageSize,
      scan: {
        capped: users.length >= USER_SCAN_LIMIT,
        limit: USER_SCAN_LIMIT,
        clicksSince:
          recentOpens.length > 0
            ? (recentOpens[recentOpens.length - 1]?.openedAt ?? null)
            : null,
        clicksCapped: recentOpens.length >= RECENT_OPENS_LIMIT,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// User detail
// ---------------------------------------------------------------------------

/**
 * getUserDetail — one user with subscription, limits, usage and content stats.
 */
export const getUserDetail = adminQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userData = (await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: args.userId },
    )) as unknown as AuthUser | null;

    if (!userData) return null;

    // See pickCanonicalSubscription — never `.first()` here, it returns the
    // oldest (usually cancelled) row.
    const userSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(SUBSCRIPTION_PER_USER_LIMIT);
    const subscription = pickCanonicalSubscription(userSubscriptions);

    const plan = deriveEffectivePlan(subscription);
    const metadata = userData.metadata;
    const baseLimits = getLimits(plan);
    const customLimits = parseCustomLimits(metadata);
    const effectiveLimits = getLimits(plan, metadata);

    const counter = await ctx.db
      .query("userCounters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(USER_BOOKMARK_LIMIT);

    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(USER_OPEN_LIMIT);

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(USER_TAG_LIMIT);

    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(USER_CONVERSATION_LIMIT);

    const statusBreakdown = { PENDING: 0, PROCESSING: 0, READY: 0, ERROR: 0 };
    const typeBreakdown: Record<string, number> = {};
    for (const bookmark of bookmarks) {
      statusBreakdown[bookmark.status] += 1;
      const type = bookmark.type ?? "UNKNOWN";
      typeBreakdown[type] = (typeBreakdown[type] ?? 0) + 1;
    }

    const now = Date.now();
    const openTimestamps = opens.map((open) => open.openedAt);

    return {
      id: userData._id,
      name: userData.name ?? null,
      email: userData.email ?? null,
      image: userData.image ?? null,
      role: userData.role ?? null,
      banned: userData.banned ?? null,
      banReason: userData.banReason ?? null,
      banExpires: userData.banExpires ?? null,
      emailVerified: userData.emailVerified ?? false,
      createdAt: userData.createdAt ?? 0,
      updatedAt: userData.updatedAt ?? null,
      onboarding: userData.onboarding ?? false,
      unsubscribed: userData.unsubscribed ?? false,
      stripeCustomerId: userData.stripeCustomerId ?? null,
      publicLinkEnabled: userData.publicLinkEnabled ?? false,
      publicLinkSlug: userData.publicLinkSlug ?? null,
      metadata: userData.metadata ?? null,
      plan,
      bookmarkCount: counter?.bookmarkCount ?? 0,
      clickCount: opens.length,
      clickCountCapped: opens.length >= USER_OPEN_LIMIT,
      clicks7d: countInWindow(openTimestamps, now - 7 * DAY_MS, now),
      clicks30d: countInWindow(openTimestamps, now - 30 * DAY_MS, now),
      tagCount: tags.length,
      tagCountCapped: tags.length >= USER_TAG_LIMIT,
      conversationCount: conversations.length,
      conversationCountCapped: conversations.length >= USER_CONVERSATION_LIMIT,
      lastBookmarkAt: bookmarks[0]?.createdAt ?? null,
      lastClickAt: opens[0]?.openedAt ?? null,
      lastConversationAt: conversations[0]?.updatedAt ?? null,
      statusBreakdown,
      typeBreakdown,
      sampleSize: bookmarks.length,
      sampleCapped: bookmarks.length >= USER_BOOKMARK_LIMIT,
      monthKey: counter?.monthKey ?? null,
      monthlyRuns: counter?.monthlyRuns ?? 0,
      monthlyChatQueries: counter?.monthlyChatQueries ?? 0,
      recentBookmarks: bookmarks.slice(0, 8).map((bookmark) => ({
        id: bookmark._id,
        url: bookmark.url,
        title: bookmark.title ?? null,
        type: bookmark.type ?? null,
        status: bookmark.status,
        starred: bookmark.starred,
        createdAt: bookmark.createdAt,
      })),
      subscription: subscription
        ? {
            plan: subscription.plan,
            provider: subscription.provider ?? null,
            status: subscription.status ?? null,
            periodStart: subscription.periodStart ?? null,
            periodEnd: subscription.periodEnd ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? null,
            stripeCustomerId: subscription.stripeCustomerId ?? null,
            stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
            createdAt: subscription.createdAt,
          }
        : null,
      baseLimits,
      customLimits,
      effectiveLimits,
    };
  },
});

// ---------------------------------------------------------------------------
// User activity
// ---------------------------------------------------------------------------

/**
 * getUserActivity — per-user timeline (bookmarks saved, links opened,
 * conversations), newest first.
 */
export const getUserActivity = adminQuery({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 25), 1), 60);
    const events: ActivityEvent[] = [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    for (const bookmark of bookmarks) {
      events.push({
        id: `bookmark:${bookmark._id}`,
        type: "bookmark",
        at: bookmark.createdAt,
        title: bookmark.title || bookmark.url,
        subtitle: bookmark.url,
        userId: args.userId,
        userName: null,
        meta: bookmark.status,
      });
    }

    const opens = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_user_opened", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const openedBookmarks = await Promise.all(
      opens.map((open) => ctx.db.get(open.bookmarkId)),
    );

    opens.forEach((open, index) => {
      const bookmark = openedBookmarks[index];
      events.push({
        id: `open:${open._id}`,
        type: "open",
        at: open.openedAt,
        title: bookmark?.title || bookmark?.url || "Opened a bookmark",
        subtitle: bookmark?.url ?? null,
        userId: args.userId,
        userName: null,
        meta: "opened",
      });
    });

    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    for (const conversation of conversations) {
      events.push({
        id: `conversation:${conversation._id}`,
        type: "conversation",
        at: conversation.updatedAt,
        title: conversation.title || "Untitled conversation",
        subtitle: null,
        userId: args.userId,
        userName: null,
        meta: conversation.likes === 0 ? "chat" : `feedback ${conversation.likes}`,
      });
    }

    return events.sort((a, b) => b.at - a.at).slice(0, limit);
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
    const all = await ctx.db
      .query("chatConversations")
      .take(CONVERSATION_SCAN_LIMIT);
    const withFeedback = all
      .filter((conversation) => conversation.likes !== 0)
      .sort((a, b) => b.likes - a.likes);

    const usersById = await fetchUsersByIds(
      ctx,
      withFeedback.map((conversation) => conversation.userId),
    );

    return withFeedback.map((conversation) => {
      const user = usersById.get(conversation.userId);
      return {
        id: conversation._id as string,
        title: conversation.title ?? null,
        likes: conversation.likes,
        updatedAt: conversation.updatedAt,
        userId: conversation.userId,
        user: {
          name: user?.name ?? "Unknown",
          email: user?.email ?? "unknown@email.com",
        },
      };
    });
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
      .take(CONVERSATION_MESSAGE_LIMIT);

    const user = (await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: conversation.userId,
    })) as unknown as AuthUser | null;

    return {
      id: conversation._id as string,
      title: conversation.title ?? null,
      likes: conversation.likes,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      userId: conversation.userId,
      user: {
        name: user?.name ?? "Unknown",
        email: user?.email ?? "unknown@email.com",
      },
      messages: messageRows.map((row) => row.content),
    };
  },
});
