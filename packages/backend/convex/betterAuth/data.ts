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
