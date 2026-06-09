# Phase 02 — Auth Backend (Convex + Better Auth)

**Goal:** stand up Better Auth on Convex (user-centric, no orgs) with SaveIt's plugins and custom
user fields, plus the function builders every other phase uses.

**Reference files:**
`nowstack-saas/convex/auth/config.ts`, `convex/betterAuth/{schema,adapter,data}.ts`,
`convex/auth.config.ts`, `convex/http.ts`; `nowstack-mobile/convex/{auth.ts,functions.ts}`.

**Current SaveIt auth to replace:** `apps/web/src/lib/{auth.ts,auth-params.ts,auth-client.ts,auth-limits.ts,auth/*}`
(Better Auth on Prisma).

---

## 1. Better Auth component schema (with SaveIt custom user fields)

Create `packages/backend/convex/betterAuth/schema.ts` (model: nowstack-saas `betterAuth/schema.ts`,
but **drop `organization`, `member`, `invitation`** and **extend `user`**):

Tables: `user`, `session`, `account`, `verification`, `apikey`, `jwks`, `rateLimit`.

Extend `user` with SaveIt fields (these are the columns from `packages/database/prisma/schema.prisma`
`User` model that aren't standard Better Auth):
```ts
user: defineTable({
  // standard BA
  name, email, emailVerified, image, createdAt, updatedAt,
  role, banned, banReason, banExpires,
  // SaveIt custom
  stripeCustomerId: v.optional(v.string()),
  onboarding: v.optional(v.boolean()),
  unsubscribed: v.optional(v.boolean()),
  publicLinkSlug: v.optional(v.string()),
  publicLinkEnabled: v.optional(v.boolean()),
  metadata: v.optional(v.any()),   // customLimits, limitEmailSent, etc.
})
  .index("email", ["email"])
  .index("role", ["role"])
  .index("publicLinkSlug", ["publicLinkSlug"]),
session: defineTable({ ..., userId, impersonatedBy }) // keep impersonatedBy for admin
```
> `session.impersonatedBy` preserves admin impersonation (SaveIt uses it today via `ChatSnippet`).

## 2. Adapter + data helpers

`packages/backend/convex/betterAuth/adapter.ts` (verbatim pattern from nowstack-saas):
```ts
import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "../auth/config";
import schema from "./schema";
export const { create, findOne, findMany, updateOne, updateMany, deleteOne, deleteMany } =
  createApi(schema, createAuthOptions);
```

`packages/backend/convex/betterAuth/data.ts` — internal helpers to read/patch the custom user fields
from app functions (e.g. `getUserById`, `patchUser` for `stripeCustomerId`, `onboarding`,
`publicLinkSlug`, `unsubscribed`, `metadata.customLimits`). Model: nowstack-saas `betterAuth/data.ts`.

## 3. Convex auth config bridge

`packages/backend/convex/auth.config.ts`:
```ts
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";
export default { providers: [getAuthConfigProvider()] } satisfies AuthConfig;
```

## 4. `createAuth` + helpers (the core)

`packages/backend/convex/auth/config.ts` (model: nowstack-saas `auth/config.ts`, simplified to
user-centric). Key points:

```ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";   // recommended for Convex (lighter); plain "better-auth" also works (nowstack-saas uses it)
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { admin } from "better-auth/plugins/admin";
import { apiKey } from "@better-auth/api-key";       // CORRECTED: moved out of better-auth/plugins in 1.x
import { expo } from "@better-auth/expo";
import authConfig from "../auth.config";
import betterAuthSchema from "../betterAuth/schema";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";

export const authComponent = createClient<DataModel, typeof betterAuthSchema>(
  components.betterAuth,
  { local: { schema: betterAuthSchema } },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
  baseURL: process.env.CONVEX_SITE_URL,
  trustedOrigins: [
    process.env.SITE_URL ?? "http://localhost:3000",
    "saveit://", "exp://",                       // mobile scheme + Expo Go
    "chrome-extension://*", "moz-extension://*", // browser extensions
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ],
  database: authComponent.adapter(ctx),
  session: { expiresIn: 60 * 60 * 24 * 400, updateAge: 60 * 60 * 24 }, // 400d, refresh daily (parity)
  account: { accountLinking: { enabled: true } },
  socialProviders: getSocialProviders(),          // github + google (+ apple for mobile)
  emailAndPassword: { enabled: false },           // SaveIt uses OTP/magic/oauth
  // REQUIRED so custom user fields appear (typed) on auth.api.getSession().user — see note below.
  user: { additionalFields: {
    stripeCustomerId: { type: "string", required: false },
    onboarding: { type: "boolean", required: false },
    unsubscribed: { type: "boolean", required: false },
    publicLinkSlug: { type: "string", required: false },
    publicLinkEnabled: { type: "boolean", required: false },
    // role/banned/banReason/banExpires come from the admin plugin
  } },
  emailVerification: { sendVerificationEmail: scheduleVerifyEmail(ctx) },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // parity with current onUserCreate: Stripe customer, welcome bookmark, new-subscriber drip
          await ctx.runMutation(internal.auth.hooks.onUserCreated, { userId: user.id });
        },
      },
    },
  },
  plugins: [
    emailOTP({ otpLength: 6, expiresIn: 300, sendVerificationOTP: scheduleOtpEmail(ctx) }),
    magicLink({ sendMagicLink: scheduleMagicLink(ctx) }),
    admin({}),                       // role-based admin + impersonation
    apiKey({ rateLimit: { enabled: false } }),
    expo(),                          // bearer-token sessions for mobile (shared backend)
    crossDomain({ siteUrl: process.env.SITE_URL ?? "http://localhost:3000" }), // ADDED: web+mobile share one backend
    convex({ authConfig }),          // MUST be last
  ],
});

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));

export async function requireAuth(ctx) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  const session = await auth.api.getSession({ headers });
  if (!session?.user) throwUnauthorized();
  // SECURITY (Phase 17 B2): block banned users at the function layer, not just the client.
  const u = session.user as { banned?: boolean; banExpires?: number };
  if (u.banned && (!u.banExpires || u.banExpires > Date.now())) throwForbidden("Account banned");
  return { auth, headers, session, user: session.user };
}
export async function requireAdmin(ctx) {
  const { session, ...rest } = await requireAuth(ctx);
  if ((session.user as { role?: string }).role !== "admin") throwUnauthorized();
  return { session, ...rest };
}
```

> The `schedule*Email` helpers `ctx.scheduler.runAfter(0, internal.email.actions.sendMarkdownEmail, …)`
> — wired in Phase 10. Stub them to no-op first so auth compiles, then fill in.

> **Security helpers (Phase 17):** create `convex/utils/errors.ts` with `throwUnauthorized` /
> `throwForbidden` / `throwNotFound` / `throwValidationError` / `throwLimitReached` (each throwing
> `ConvexError<{ code, message }>`) — used above and by every ownership/limit check. Also: (1) build
> `trustedOrigins`/`allowedHosts` dynamically incl. Vercel preview patterns (`saveit-now-*`, `*.vercel.app`)
> via `BETTER_AUTH_TRUSTED_ORIGINS` (Phase 17 B9); (2) in `emailOTP.sendVerificationOTP`, short-circuit a
> fixed OTP for `process.env.APPSTORE_TEST_EMAIL` and skip the email (Phase 17 B10).

`packages/backend/convex/auth/hooks.ts` — port ALL of SaveIt's current Better Auth hooks
(`apps/web/src/lib/auth.ts` + `auth-params.ts`):
- `databaseHooks.user.create.after` → `onUserCreated`: create Stripe customer (Phase 09), insert welcome
  bookmark (Phase 05), schedule `new-subscriber` drip (Phase 10).
- `user.deleteUser.beforeDelete` → cancel all active Stripe subscriptions (current `auth-params.ts:34-54`).
- `user.deleteUser.afterDelete` → send the account-deletion confirmation email (Phase 10).

> **Custom user fields (verified caveat):** the component schema (§1) makes the fields exist in Convex,
> but they only appear on `auth.api.getSession().user` (and are typed) because of the
> `user.additionalFields` block above. Without `additionalFields`, `requireAuth().user.stripeCustomerId`
> would be `undefined`/untyped — you'd instead have to read the full doc via
> `authComponent.safeGetAuthUser(ctx)`. Keep `additionalFields` in sync with the schema.

> **Drop `reactStartCookies()`** — SaveIt's current web auth (`auth-params.ts:166`) uses it for Next/TanStack
> cookie handling; on Convex, cookie/session handling is done by `convexBetterAuthReactStart` (Phase 03),
> so this plugin is removed, not ported.

## 5. HTTP routes

`packages/backend/convex/http.ts`:
```ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth/config";
const http = httpRouter();
authComponent.registerRoutes(http, createAuth, { cors: true });
// stripe webhook (Phase 09), /api/v1/* (Phase 12), chat stream (Phase 08) added here too.
export default http;
```

## 6. Function builders (user-centric)

`packages/backend/convex/functions.ts` (model: nowstack-mobile `convex/functions.ts`, but resolve the
user via Better Auth, not a separate users table — our user row *is* the BA user):
```ts
import { customQuery, customMutation, customAction, customCtx } from "convex-helpers/server/customFunctions";
import { query, mutation, action } from "./_generated/server";
import { requireAuth } from "./auth/config";

export const authQuery = customQuery(query, customCtx(async (ctx) => {
  const { user } = await requireAuth(ctx);
  return { user };
}));
export const authMutation = customMutation(mutation, customCtx(async (ctx) => {
  const { user } = await requireAuth(ctx);
  return { user };
}));
export const authAction = customAction(action, customCtx(async (ctx) => {
  const { user } = await requireAuth(ctx);
  return { user };
}));
```
Also export `adminQuery/adminMutation/adminAction` (wrap `requireAdmin`) and an `apiKeyAction`
(Phase 12) that resolves the user from a bearer API key.

## 7. Auth queries

`packages/backend/convex/auth/queries.ts`:
```ts
export const getCurrentUser = query({ args: {}, handler: (ctx) => authComponent.safeGetAuthUser(ctx) });
export const getSession = query({ args: {}, handler: async (ctx) => {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  return auth.api.getSession({ headers });
}});
```

## Acceptance criteria
- `npx convex dev --once` deploys auth; `/api/auth/*` is live on the `.convex.site` URL.
- A throwaway `authQuery` returns the user when authenticated and throws otherwise.
- `requireAdmin` gates on `role === "admin"`.

## Risks
- Putting `convex()` not-last → silent auth failures. Keep it last.
- Custom user fields must be optional (`v.optional`) so BA's internal writes don't fail validation.
- `expo()` plugin + cookie web both work on one backend; make sure `trustedOrigins` covers all
  surfaces before testing OAuth.
