import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Local Better Auth component schema (user-centric, NO organizations).
 *
 * The `user` table is extended with SaveIt's custom fields (ported from the
 * Prisma `User` model) so that `userId === betterAuth user id` everywhere.
 * Custom fields MUST be optional so Better Auth's internal writes never fail
 * validation. Fields that should appear (typed) on `auth.api.getSession().user`
 * must ALSO be declared in `user.additionalFields` in `auth/config.ts`.
 */
export const tables = {
  user: defineTable({
    // standard Better Auth
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.union(v.null(), v.string())),
    // admin plugin
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    banExpires: v.optional(v.union(v.null(), v.number())),
    // SaveIt custom user fields
    stripeCustomerId: v.optional(v.union(v.null(), v.string())),
    onboarding: v.optional(v.union(v.null(), v.boolean())),
    unsubscribed: v.optional(v.union(v.null(), v.boolean())),
    publicLinkSlug: v.optional(v.union(v.null(), v.string())),
    publicLinkEnabled: v.optional(v.union(v.null(), v.boolean())),
    metadata: v.optional(v.any()),
  })
    .index("email_name", ["email", "name"])
    .index("email", ["email"])
    .index("name", ["name"])
    .index("role", ["role"])
    .index("banned", ["banned"])
    .index("banned_role", ["banned", "role"])
    .index("createdAt", ["createdAt"])
    .index("userId", ["userId"])
    .index("publicLinkSlug", ["publicLinkSlug"]),

  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
    // admin plugin — preserves SaveIt admin impersonation
    impersonatedBy: v.optional(v.union(v.null(), v.string())),
  })
    .index("expiresAt", ["expiresAt"])
    .index("expiresAt_userId", ["expiresAt", "userId"])
    .index("token", ["token"])
    .index("userId", ["userId"]),

  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("providerId_userId", ["providerId", "userId"])
    .index("userId", ["userId"]),

  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("identifier", ["identifier"]),

  // api-key plugin (references = user by default)
  apikey: defineTable({
    configId: v.string(),
    name: v.optional(v.union(v.null(), v.string())),
    start: v.optional(v.union(v.null(), v.string())),
    referenceId: v.string(),
    prefix: v.optional(v.union(v.null(), v.string())),
    key: v.string(),
    refillInterval: v.optional(v.union(v.null(), v.number())),
    refillAmount: v.optional(v.union(v.null(), v.number())),
    lastRefillAt: v.optional(v.union(v.null(), v.number())),
    enabled: v.boolean(),
    rateLimitEnabled: v.boolean(),
    rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
    rateLimitMax: v.optional(v.union(v.null(), v.number())),
    requestCount: v.number(),
    remaining: v.optional(v.union(v.null(), v.number())),
    lastRequest: v.optional(v.union(v.null(), v.number())),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
    permissions: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())),
  })
    .index("configId", ["configId"])
    .index("referenceId", ["referenceId"])
    .index("referenceId_createdAt", ["referenceId", "createdAt"])
    .index("key", ["key"]),

  // jwks for the convex auth bridge
  jwks: defineTable({
    publicKey: v.string(),
    privateKey: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    alg: v.optional(v.union(v.null(), v.string())),
    crv: v.optional(v.union(v.null(), v.string())),
  }),

  // rate limit table
  rateLimit: defineTable({
    key: v.string(),
    count: v.number(),
    lastRequest: v.number(),
  }).index("key", ["key"]),
};

export default defineSchema(tables);
