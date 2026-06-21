import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Internal helpers (run INSIDE the betterAuth component) to read/patch the
 * SaveIt custom fields on the auth `user` table. App functions call these via
 * `ctx.runQuery(components.betterAuth.data.*)`.
 */

const MAX_AUTH_ROWS = 500;

const includesSearch = (value: unknown, search: string) =>
  String(value ?? "")
    .toLowerCase()
    .includes(search.toLowerCase());

const boundedLimit = (limit: number) =>
  Math.max(1, Math.min(Math.trunc(limit), MAX_AUTH_ROWS));

export const getUserById = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("user", args.userId);
    return id ? ctx.db.get(id) : null;
  },
});

export const getUserByEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getUserByPublicSlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("user")
      .withIndex("publicLinkSlug", (q) => q.eq("publicLinkSlug", args.slug))
      .first();
  },
});

export const listUsersByIds = queryGeneric({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.userIds.map(async (userId) => {
        const id = ctx.db.normalizeId("user", userId);
        return id ? ctx.db.get(id) : null;
      }),
    );
    return rows.flatMap((row) => (row ? [row] : []));
  },
});

export const listUsersForAdmin = queryGeneric({
  args: {
    limit: v.number(),
    sort: v.union(v.literal("asc"), v.literal("desc")),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"))),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const rows = await ctx.db
      .query("user")
      .withIndex("createdAt")
      .order(args.sort)
      .take(limit);

    const search = args.search?.trim();
    return rows.filter((row) => {
      if (args.role && row.role !== args.role) return false;
      if (args.status === "banned" && row.banned !== true) return false;
      if (args.status === "active" && row.banned === true) return false;
      if (!search) return true;
      return (
        includesSearch(row.email, search) || includesSearch(row.name, search)
      );
    });
  },
});

/** Patch any of the SaveIt custom fields (and admin fields) on a user row. */
export const patchUser = mutationGeneric({
  args: {
    userId: v.string(),
    update: v.object({
      stripeCustomerId: v.optional(v.union(v.string(), v.null())),
      onboarding: v.optional(v.boolean()),
      unsubscribed: v.optional(v.boolean()),
      publicLinkSlug: v.optional(v.union(v.string(), v.null())),
      publicLinkEnabled: v.optional(v.boolean()),
      metadata: v.optional(v.any()),
      role: v.optional(v.union(v.string(), v.null())),
      banned: v.optional(v.union(v.boolean(), v.null())),
      banReason: v.optional(v.union(v.string(), v.null())),
      banExpires: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("user", args.userId);
    if (!id) return null;

    const update: Partial<Doc<"user">> = {};
    for (const [key, value] of Object.entries(args.update)) {
      if (value !== undefined) {
        (update as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(update).length > 0) {
      update.updatedAt = Date.now();
      await ctx.db.patch(id, update);
    }
    return ctx.db.get(id);
  },
});

// ---------------------------------------------------------------------------
// Migration helpers — called from convex/migration/import.ts via
// ctx.runMutation(components.betterAuth.data.insertUser, {...})
// These are mutationGeneric (run inside the betterAuth component namespace).
// ---------------------------------------------------------------------------

/**
 * insertUser — idempotent. Skips insert and returns the existing _id if a user
 * with the same email is already present. Otherwise inserts and returns the new _id.
 */
export const insertUser = mutationGeneric({
  args: {
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    banExpires: v.optional(v.union(v.null(), v.number())),
    stripeCustomerId: v.optional(v.union(v.null(), v.string())),
    onboarding: v.optional(v.union(v.null(), v.boolean())),
    unsubscribed: v.optional(v.union(v.null(), v.boolean())),
    publicLinkSlug: v.optional(v.union(v.null(), v.string())),
    publicLinkEnabled: v.optional(v.union(v.null(), v.boolean())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Idempotent: return existing user _id if email already present.
    const existing = await ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (existing) {
      return existing._id as string;
    }

    const id = await ctx.db.insert("user", {
      name: args.name,
      email: args.email,
      emailVerified: args.emailVerified,
      image: args.image ?? null,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      role: args.role ?? null,
      banned: args.banned ?? null,
      banReason: args.banReason ?? null,
      banExpires: args.banExpires ?? null,
      stripeCustomerId: args.stripeCustomerId ?? null,
      onboarding: args.onboarding ?? null,
      unsubscribed: args.unsubscribed ?? null,
      publicLinkSlug: args.publicLinkSlug ?? null,
      publicLinkEnabled: args.publicLinkEnabled ?? null,
      metadata: args.metadata,
    });

    return id as string;
  },
});

/**
 * insertAccount — idempotent. Skips insert and returns the existing _id if an
 * account with the same (accountId, providerId) already exists. Otherwise inserts
 * and returns the new _id.
 */
export const insertAccount = mutationGeneric({
  args: {
    userId: v.string(),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    scope: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotent: return existing account _id if (accountId, providerId) already present.
    const existing = await ctx.db
      .query("account")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("accountId_providerId", (q: any) =>
        q.eq("accountId", args.accountId).eq("providerId", args.providerId),
      )
      .first();
    if (existing) {
      return existing._id as string;
    }

    const id = await ctx.db.insert("account", {
      userId: args.userId,
      accountId: args.accountId,
      providerId: args.providerId,
      accessToken: args.accessToken ?? null,
      refreshToken: args.refreshToken ?? null,
      idToken: args.idToken ?? null,
      scope: args.scope ?? null,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
    return id as string;
  },
});

/**
 * insertApiKey — idempotent migration helper for legacy Better Auth API keys.
 *
 * The old Prisma schema stored the owner in `userId`; the current api-key
 * plugin schema stores it in `referenceId` and requires `configId`.
 */
export const insertApiKey = mutationGeneric({
  args: {
    configId: v.optional(v.string()),
    name: v.optional(v.union(v.null(), v.string())),
    start: v.optional(v.union(v.null(), v.string())),
    referenceId: v.string(),
    prefix: v.optional(v.union(v.null(), v.string())),
    key: v.string(),
    refillInterval: v.optional(v.union(v.null(), v.number())),
    refillAmount: v.optional(v.union(v.null(), v.number())),
    lastRefillAt: v.optional(v.union(v.null(), v.number())),
    enabled: v.optional(v.union(v.null(), v.boolean())),
    rateLimitEnabled: v.optional(v.union(v.null(), v.boolean())),
    rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
    rateLimitMax: v.optional(v.union(v.null(), v.number())),
    requestCount: v.optional(v.union(v.null(), v.number())),
    remaining: v.optional(v.union(v.null(), v.number())),
    lastRequest: v.optional(v.union(v.null(), v.number())),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
    permissions: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    const configId = args.configId ?? "default";
    const prefix = args.prefix ?? "saveit_";
    const matchingKeys = await ctx.db
      .query("apikey")
      .withIndex("key", (q) => q.eq("key", args.key))
      .take(10);
    const existing = matchingKeys.find((row) => row.configId === configId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        configId,
        name: args.name ?? null,
        start: args.start ?? null,
        referenceId: args.referenceId,
        prefix,
        refillInterval: args.refillInterval ?? null,
        refillAmount: args.refillAmount ?? null,
        lastRefillAt: args.lastRefillAt ?? null,
        enabled: args.enabled ?? true,
        rateLimitEnabled: args.rateLimitEnabled ?? false,
        rateLimitTimeWindow: args.rateLimitTimeWindow ?? null,
        rateLimitMax: args.rateLimitMax ?? null,
        requestCount: args.requestCount ?? 0,
        remaining: args.remaining ?? null,
        lastRequest: args.lastRequest ?? null,
        expiresAt: args.expiresAt ?? null,
        updatedAt: args.updatedAt,
        permissions: args.permissions ?? null,
        metadata: args.metadata ?? null,
      });
      return existing._id as string;
    }

    const id = await ctx.db.insert("apikey", {
      configId,
      name: args.name ?? null,
      start: args.start ?? null,
      referenceId: args.referenceId,
      prefix,
      key: args.key,
      refillInterval: args.refillInterval ?? null,
      refillAmount: args.refillAmount ?? null,
      lastRefillAt: args.lastRefillAt ?? null,
      enabled: args.enabled ?? true,
      rateLimitEnabled: args.rateLimitEnabled ?? false,
      rateLimitTimeWindow: args.rateLimitTimeWindow ?? null,
      rateLimitMax: args.rateLimitMax ?? null,
      requestCount: args.requestCount ?? 0,
      remaining: args.remaining ?? null,
      lastRequest: args.lastRequest ?? null,
      expiresAt: args.expiresAt ?? null,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      permissions: args.permissions ?? null,
      metadata: args.metadata ?? null,
    });
    return id as string;
  },
});

export const getSessionById = queryGeneric({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("session", args.sessionId);
    return id ? ctx.db.get(id) : null;
  },
});

export const listSessionsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("session")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const listAccountsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("account")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const listApiKeysByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("apikey")
      .withIndex("referenceId_createdAt", (q) =>
        q.eq("referenceId", args.userId),
      )
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});
