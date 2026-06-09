# Porting Spec 01 — Auth (Better Auth on Convex)

**Target phases:** 02 (Auth Backend), 03 (Auth Web Client), 17 (Security Parity)
**Spec author:** analysis agent (read-only, June 2025)

---

## 1. Current files and responsibilities

| File | Responsibility |
|------|---------------|
| `apps/web/src/lib/auth.ts` | Top-level `betterAuth(...)` instantiation; wires Prisma adapter, session config, the `databaseHooks.user.create.after` hook (Stripe customer + welcome bookmark + Inngest new-subscriber event), and spreads `AUTH_PARAMS`. |
| `apps/web/src/lib/auth-params.ts` | All Better Auth config options: `baseURL`, `trustedOrigins` (dynamic fn), `user.*` (changeEmail, deleteUser hooks, additionalFields), `socialProviders`, `advanced.cookiePrefix`, and the `plugins` array. |
| `apps/web/src/lib/auth-client.ts` | Browser-side `createAuthClient` with `magicLinkClient`, `adminClient`, `emailOTPClient`, `apiKeyClient`. Exports `signIn`, `signUp`, `useSession`. |
| `apps/web/src/lib/auth-limits.ts` | `AuthLimits` type, `AUTH_LIMITS` constants (free/pro), `parseCustomAuthLimits`, `getAuthLimits`. These are the **plan gate values** used throughout the app. |
| `apps/web/src/lib/auth-session.ts` | SSR session helpers using `auth.api.getSession` + Prisma for limits: `getUser`, `getRequiredUser`, `getRequiredUserOrRedirect`, `getUserLimits`, `getUserLimitsOrRedirect`. |
| `apps/web/src/lib/auth/api-key-auth.ts` | `validateApiKey(request)`: extracts `Bearer` token, calls `auth.api.verifyApiKey`, checks Prisma for subscription + metadata, gates on `limits.apiAccess === 1` (pro-only). Returns `{ success, user: { id }, apiKey: { id, name } }`. |
| `apps/web/src/lib/auth/user-plan.ts` | Client-side Zustand store `useUserPlan` + `InjectUserPlan` component — propagates plan/limits into UI without prop-drilling. |
| `apps/web/src/lib/auth/stripe/auth-plans.ts` | `AUTH_PLANS` array (free + pro), `AppAuthPlan` type, `getPlanByName`, `getPlanByPriceId`. Pro plan has `onSubscriptionComplete` (logs + sends `user/subscription` to Inngest) and env vars `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_YEARLY_PRICE_ID`. |
| `apps/web/src/lib/cors.ts` | `allowedOrigins` list + `updateHeaders()` which sets CORS response headers. Used by the auth route proxy and API routes. |
| `apps/web/src/lib/server-url.ts` | `getServerUrl()`: returns origin based on `window.location`, `PLAYWRIGHT_TEST_BASE_URL`, `VERCEL_ENV=production` → `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` (preview), or `localhost:{PORT}`. |
| `apps/web/src/lib/safe-route.ts` | `requireUser`, `requireAdmin`, `requireApiKey`, `userRoute`, `adminRoute`, `apiRoute` route builders; `jsonError` error mapper (SafeRouteError → status, ApplicationError → 400, ZodError → 422, unknown → 500). Cookie deduplication logic. |
| `apps/web/src/lib/errors.ts` | `ApplicationError`, `SafeActionError`, `SafeRouteError` (with `status`), `BookmarkErrorType`. |
| `apps/web/src/routes/api.auth.$.ts` | TanStack Start catch-all route that proxies GET/POST to `auth.handler(request)` and OPTIONS to a 204 with CORS headers. |
| `apps/web/src/routes/api.account.keys.$keyId.ts` | PATCH handler to rename an API key: validates ownership via Prisma `apikey.updateMany({ where: { id, userId } })`, returns 404 if not found. Schema: `{ name: string (1–255 chars) }`. |
| `apps/web/src/routes/signin.tsx` | Route `/signin`; validates search params `redirectUrl`, `email`, `step`; renders `SignInPage` (client-only). |
| `apps/web/src/routes/verify.tsx` | Static page shown after email verification link is clicked. No logic — just UI. |
| `apps/web/src/features/auth/signin-page.tsx` | Full sign-in page: OTP flow (`authClient.emailOtp.sendVerificationOtp` → `authClient.signIn.emailOtp`) + GitHub/Google social buttons. Handles `redirectUrl` safe-guard (must start with `/`, not `//`). |
| `apps/web/src/features/auth/sign-in-with.tsx` | `SignInWith` component: calls `authClient.signIn.social({ provider, callbackURL })`, emits PostHog event `sign_in_with_social`. |
| `apps/web/src/features/auth/sign-in-dialog.tsx` | Modal version of sign-in (triggered via `?modal=signin` search param). Same OTP + social flows. |
| `apps/web/src/features/auth/logout.tsx` | `LogoutButton` calls `authClient.signOut(...)`, then navigates to `/`. |
| `apps/web/src/features/auth/email-change-form.tsx` | Form that calls `PATCH /api/user/profile` with `{ email }`. |
| `apps/web/src/features/auth/avatar-section.tsx` | Posts `FormData` to `POST /api/user/avatar` to update profile picture. |
| `apps/web/src/features/auth/public-link-settings.tsx` | Calls `PATCH /api/user/public-link` with `{ enabled, slug }`. Enforces slug format (lowercase, a-z0-9-, 3–50 chars) client-side. |

---

## 2. Better Auth plugins (exact config)

### 2.1 `emailOTP`

```ts
emailOTP({
  generateOTP(data) {
    // App Store review bypass: fixed OTP for "help@saveit.now"
    if (data.email === "help@saveit.now") {
      return "123456";
    }
    // 6-digit OTP, range 100000–999999
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationOTP({ email, otp }) {
    // Subject: "SaveIt.now verification code"
    // Body (markdown):
    // "Your verification code is:\n\n**{otp}**\n\nThis code expires in 5 minutes. ..."
    // preview: "Your SaveIt.now verification code is {otp}"
    // disabledSignature: true
  },
  otpLength: 6,
  expiresIn: 300, // 5 minutes = 300 seconds
})
```

**Critical:** The `generateOTP` override for `help@saveit.now` returning `"123456"` is the App Store review bypass. In the Convex port, this check should move into `sendVerificationOTP` (short-circuit the fixed OTP and skip email send if `email === process.env.APPSTORE_TEST_EMAIL`). Phase 17 B10.

### 2.2 `magicLink`

```ts
magicLink({
  async sendMagicLink(data) {
    // Subject: "Sign in to SaveIt.now"
    // Body: "Click the link below to sign in to SaveIt.now:\n\n[Sign in to SaveIt.now]({data.url})\n\nThis link expires in 10 minutes. ..."
    // preview: "Sign in to SaveIt.now"
    // disabledSignature: true
  },
})
```

### 2.3 `admin`

```ts
admin({})
```

Provides role-based admin + impersonation. Session field `session.impersonatedBy` is read by `ChatSnippet` (passes to live-chat metadata). Admins are detected by `user.role === "admin"`.

### 2.4 `apiKey` (currently `better-auth/plugins`, must move to `@better-auth/api-key`)

```ts
apiKey({
  rateLimit: {
    enabled: false,  // rate limiting is currently disabled
  },
})
```

**Important:** In better-auth 1.6.10+ the `apiKey` plugin moved to `@better-auth/api-key`. The import in `auth-params.ts` (`from "better-auth/plugins"`) is already using the old location. The Convex port MUST use `import { apiKey } from "@better-auth/api-key"`.

### 2.5 `reactStartCookies` — DROP THIS

The current `AUTH_PARAMS` includes `reactStartCookies()` (from `better-auth/react-start`) for TanStack cookie handling. This is NOT ported to Convex. Cookie/session handling on the Convex backend is done by `@convex-dev/better-auth`'s `convexBetterAuthReactStart`. Drop it.

### 2.6 `expo` — ADD THIS (not in current web app, needed for shared backend)

```ts
import { expo } from "@better-auth/expo";
expo()
```

Required so the mobile app (bearer-token sessions) works on the shared Convex backend.

### 2.7 `crossDomain` — ADD THIS (not in current web app)

```ts
import { crossDomain } from "@convex-dev/better-auth/plugins";
crossDomain({ siteUrl: process.env.SITE_URL ?? "http://localhost:3000" })
```

Required so web + mobile share one Convex backend.

### 2.8 `convex` — MUST BE LAST

```ts
import { convex } from "@convex-dev/better-auth/plugins";
convex({ authConfig })  // authConfig from auth.config.ts
```

This plugin MUST be last in the `plugins` array. Placing it earlier causes silent auth failures.

---

## 3. Session configuration

```ts
session: {
  expiresIn: 60 * 60 * 24 * 400,  // 400 days (= 34,560,000 seconds)
  updateAge: 60 * 60 * 24,          // refresh/extend every 1 day
}
```

Both values must be preserved exactly. The 400-day expiry is the maximum cookie lifespan.

---

## 4. Social providers

```ts
socialProviders: {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
}
```

Apple OAuth (`APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`) is needed for the mobile app (Phase 13) and should be added to the Convex backend even if not in the current web config.

---

## 5. Cookie prefix

```ts
advanced: {
  cookiePrefix: "save-it",
}
```

This MUST match `cookiePrefix: "save-it"` in `convexBetterAuthReactStart(...)` on the web client. Any mismatch causes `fetchAuthQuery` to return no session on SSR.

---

## 6. Account linking

The current config does NOT explicitly declare `account.accountLinking`. Better Auth's default is `enabled: false`. The Convex port plan specifies enabling it:

```ts
account: {
  accountLinking: { enabled: true },
}
```

This allows a user who signed in via GitHub to also link their Google account. This is an intentional upgrade over current behavior; document it.

---

## 7. Database hooks (ALL must be preserved)

### 7.1 `user.create.after` — `onUserCreated`

Triggered immediately after any new user row is created (OAuth, OTP, magic link).

**Step 1 — Create Stripe customer:**
```ts
const stripeCustomer = await stripeClient.customers.create({
  email: user.email,
  name: user.name,
  metadata: { userId: user.id },
});
// Then update user.stripeCustomerId = stripeCustomer.id
```
Errors are caught and logged (non-fatal). If Stripe fails, the user still exists.

**Step 2 — Create welcome bookmark:**
```ts
await createBookmark({ url: "https://saveit.now", userId: user.id });
```
Errors are caught and logged (non-fatal).

**Step 3 — Schedule new-subscriber drip:**
```ts
inngest.send({ name: "user/new-subscriber", data: { userId: user.id } });
```
In the Convex port this becomes `ctx.scheduler.runAfter(0, internal.marketing.drip.startNewSubscriberDrip, { userId: user.id })`.

**Convex target:** `packages/backend/convex/auth/hooks.ts` → `export const onUserCreated = internalMutation(...)`. Called from `databaseHooks.user.create.after` via `await ctx.runMutation(internal.auth.hooks.onUserCreated, { userId: user.id })`. Note: since Stripe API call requires Node, the hook should schedule an internal action: `ctx.scheduler.runAfter(0, internal.auth.hooks.createStripeCustomerAction, { userId, email, name })`.

### 7.2 `user.deleteUser.beforeDelete`

```ts
beforeDelete: async (user) => {
  // 1. Retrieve Stripe customer by stripeCustomerId (NOT user.id—note auth-params uses user.id
  //    which appears to be a bug; should use user.stripeCustomerId)
  const stripeCustomer = await stripeClient.customers.retrieve(user.id); // BUG: passes user.id not stripeCustomerId
  if (!stripeCustomer || stripeCustomer.deleted) return;
  
  // 2. List all subscriptions for the customer
  const subscriptions = await stripeClient.subscriptions.list({
    customer: stripeCustomer.id,
  });
  if (!subscriptions.data.length) return;
  
  // 3. Cancel all active subscriptions in parallel
  await Promise.all(
    subscriptions.data.map((sub) => stripeClient.subscriptions.cancel(sub.id))
  );
}
```

**Known bug:** `auth-params.ts:54` passes `user.id` to `customers.retrieve`, but `retrieve` expects a Stripe customer ID (starts with `cus_`). This works only if `user.stripeCustomerId` was stored and happens to equal `user.id` — which it doesn't. The Convex port must **fix this**: look up `user.stripeCustomerId` from the Convex user doc and pass THAT to `customers.retrieve`. If `stripeCustomerId` is null/undefined, skip gracefully.

**Errors are swallowed** (the `catch` just logs at debug level) — preserve this behavior.

### 7.3 `user.deleteUser.afterDelete`

```ts
afterDelete: async (user) => {
  // Send account-deletion confirmation email
  // Subject: "Account Deleted"
  // Body (markdown, verbatim):
  // "It's Melvyn, the founder of SaveIt.now.\n\nI'm sending you this email to confirm that
  //  your account has been permanently deleted.\n\nIf you have any questions, feel free to
  //  reach out at help@saveit.now."
  // preview: "Your account has been deleted"
}
```

### 7.4 `user.deleteUser.sendDeleteAccountVerification`

```ts
sendDeleteAccountVerification: async ({ user, url }) => {
  // Subject: "Verify Deletion"
  // Body (markdown, verbatim):
  // "You requested to delete your account.\n\nClick the link below to confirm the deletion:
  //  [Delete my account]({url})\n\nIf you didn't request this, please ignore this email."
  // preview: "Confirm your account deletion"
}
```

### 7.5 `user.changeEmail.sendChangeEmailVerification`

```ts
sendChangeEmailVerification: async ({ user, newEmail, url }) => {
  // Subject: "Approve email change"
  // Body (markdown, verbatim):
  // "You requested to change your email address from {user.email} to {newEmail}.\n\n
  //  Click the link below to approve this change:\n[Approve email change]({url})\n\n
  //  If you didn't request this change, please ignore this email."
  // preview: "Approve your email change"
}
```

---

## 8. Custom user fields (Prisma schema → Convex)

From `packages/database/prisma/schema.prisma` model `User`:

| Field | Prisma type | Default | Notes |
|-------|------------|---------|-------|
| `stripeCustomerId` | `String?` | null | Set after Stripe customer creation in `onUserCreated` |
| `onboarding` | `Boolean` | `false` | Better Auth `additionalFields` with `defaultValue: false, required: true`; tracks onboarding completion |
| `banned` | `Boolean?` | null | Set by admin plugin |
| `banReason` | `String?` | null | Set by admin plugin |
| `banExpires` | `DateTime?` | null | Set by admin plugin |
| `role` | `String?` | null | Set by admin plugin; `"admin"` value for admins |
| `unsubscribed` | `Boolean` | `false` | Marketing email opt-out; checked before sending any drip |
| `publicLinkSlug` | `String?` | null | Unique; URL slug for public bookmark page; format: lowercase a-z0-9- |
| `publicLinkEnabled` | `Boolean` | `false` | Gate for public bookmark page |
| `metadata` | `Json?` | null | Structure: `{ limitEmailSentAt?: string (ISO), customLimits?: CustomAuthLimits }` where `CustomAuthLimits = Partial<{ bookmarks, monthlyBookmarkRuns, monthlyChatQueries, canExport, apiAccess }>` — all positive integers |

**In Convex `betterAuth/schema.ts`:** all custom fields must be `v.optional(...)` so Better Auth's internal writes don't fail validation when they don't supply these fields.

**In `createAuthOptions`:** `user.additionalFields` must declare `stripeCustomerId`, `onboarding`, `unsubscribed`, `publicLinkSlug`, `publicLinkEnabled` — otherwise `auth.api.getSession().user` does not return them (they stay `undefined`/untyped). `banned`/`banReason`/`banExpires`/`role` come from the `admin` plugin and don't need to be in `additionalFields`.

**Indexes needed on the Convex `user` table:**
- `by_email: ["email"]`
- `by_role: ["role"]`
- `by_publicLinkSlug: ["publicLinkSlug"]`

---

## 9. Plan limits (must be preserved exactly)

```ts
// apps/web/src/lib/auth-limits.ts
export type AuthLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  monthlyChatQueries: number;
  canExport: number;   // 0 = no, 1 = yes (numeric flag)
  apiAccess: number;   // 0 = no, 1 = yes (numeric flag)
};

export const AUTH_LIMITS = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,
    canExport: 1,
    apiAccess: 1,
  },
};
```

**`getAuthLimits(subscription?, metadata?)`** logic: start with `AUTH_LIMITS[subscription.plan]` (falling back to `free`), then merge `parseCustomAuthLimits(metadata)` on top. Custom limits override plan limits per-key — this is used by admins to grant individual users higher limits.

**`parseCustomAuthLimits(metadata)`**: reads `metadata.customLimits` object, validates each key is in `AUTH_LIMIT_KEYS`, value is a finite non-negative integer, and returns `Partial<AuthLimits>`.

**`metadata.limitEmailSentAt`**: ISO date string stored when the limit-reached email has been sent. Used by `hasLimitEmailBeenSent` to avoid re-sending.

In Convex, port these to `packages/backend/convex/billing/plans.ts`. The `getAuthLimits` function will be used in `authQuery/authMutation` contexts to enforce limits.

---

## 10. API key authentication (`validateApiKey`)

Current flow in `apps/web/src/lib/auth/api-key-auth.ts`:

1. Extract `Authorization: Bearer <token>` header.
2. Call `auth.api.verifyApiKey({ body: { key: token } })`.
3. If `!result.valid` or `!result.key` → return `{ success: false, error, status: 401 }`.
4. Fetch user from Prisma: `{ metadata, subscriptions[0].plan }` where subscription is `active|trialing`.
5. Compute `limits = getAuthLimits({ plan }, metadata)`.
6. If `limits.apiAccess === 0` → return `{ success: false, error: "Pro plan required", status: 403 }`.
7. Return `{ success: true, user: { id: result.key.userId }, apiKey: { id: result.key.id, name: result.key.name || "" } }`.

**Return shape clients depend on:**
```ts
// success:
{ success: true, user: { id: string }, apiKey: { id: string, name: string } }
// failure:
{ success: false, error: string, status: number }
```

**In Convex (`apiKeyAction` builder):** use `authComponent.verifyApiKey(ctx, token)` (or `@better-auth/api-key` verification), then inject `{ user, apiKey: { id, name } }` into context. The builder must call `throwForbidden("Pro plan required")` if `limits.apiAccess === 0`. Phase 17 B8: context must include `apiKey.name` so audit logging doesn't get `undefined`.

**API key rename endpoint** (`PATCH /api/account/keys/$keyId`):
- Auth: `requireUser` (cookie session, NOT API key)
- Ownership check: `apikey.updateMany({ where: { id: params.keyId, userId: user.id } })`
- Schema: `{ name: z.string().trim().min(1).max(255) }`
- Response: `{ success: true }` or `{ error: "API key not found" }` (404)
- In Convex: port as `authMutation` in `convex/apiKeys/mutations.ts` that patches the key doc verifying `userId` ownership.

---

## 11. CORS configuration

`apps/web/src/lib/cors.ts` — `allowedOrigins` list (exact values):

```ts
const allowedOrigins = [
  "saveit://*",
  "saveit://",
  "http://localhost:8081",   // mobile Expo dev
  "http://localhost:8081/*",
  "http://localhost:3000",
  "http://localhost:3000/*",
  "http://localhost:3001",
  "http://localhost:3001/*",
  "http://localhost:3002",
  "http://localhost:3002/*",
  "http://localhost:3003",
  "http://localhost:3003/*",
  "http://localhost:*",
  "http://127.0.0.1:*",
  "https://saveit.now",
  "https://saveit.now/*",
  "https://*.saveit.now",
  "https://saveit-now-web-codelynx.vercel.app",        // specific Vercel deploys
  "https://saveit-now-web-git-main-codelynx.vercel.app",
  "https://saveit-now-*",   // Vercel preview pattern
];
```

CORS headers set by `updateHeaders()`:
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Max-Age: 86400`
- `Access-Control-Allow-Origin: <origin>` (reflected, only if in allowedOrigins)
- `Access-Control-Allow-Credentials: true`

Origin matching: exact match OR prefix match for patterns ending in `*`.

**Current auth proxy route** (`api.auth.$.ts`) applies CORS to every auth response and handles OPTIONS with 204.

**In Convex:** `authComponent.registerRoutes(http, createAuth, { cors: true })` handles CORS for auth routes. The Vercel preview pattern (`https://saveit-now-*`) and browser extension schemes must go into `BETTER_AUTH_TRUSTED_ORIGINS` env var (comma-separated). Additionally `trustedOrigins` in `createAuthOptions` should include:
```ts
"saveit://", "exp://",
"chrome-extension://*", "moz-extension://*",
...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
```

Phase 17 B9: use `getAllowedHosts()` pattern to accept Vercel preview URLs dynamically.

---

## 12. `trustedOrigins` — current dynamic function

Currently `trustedOrigins` in `AUTH_PARAMS` is a **function** that inspects the `request.headers.get("origin")`:
```ts
trustedOrigins: (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) return [];
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return [origin];
    }
  } catch { return []; }
  return [];
},
```

This only trusts localhost dynamically; all other trusted origins come implicitly from the `baseURL`. This means Vercel preview URLs are NOT currently trusted unless via `allowedOrigins` in cors.ts (which only applies to CORS headers, not BA session acceptance). The Convex port should fix this properly via the `BETTER_AUTH_TRUSTED_ORIGINS` env var.

---

## 13. `getServerUrl()` logic (for `baseURL`)

```ts
export const getServerUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.PLAYWRIGHT_TEST_BASE_URL) return process.env.PLAYWRIGHT_TEST_BASE_URL;
  if (process.env.VERCEL_ENV === "production") return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
};
```

In Convex this becomes: `baseURL: process.env.CONVEX_SITE_URL` (the `.convex.site` URL). On the web client, `baseURL` in `createAuthClient` should use `getServerUrl()` (app origin), not the Convex site URL — the client talks to `/api/auth/*` which proxies to Convex.

---

## 14. SSR session helpers — Convex replacements

Current (`auth-session.ts`) calls `auth.api.getSession({ headers: getRequestHeaders() })` and Prisma for subscriptions.

Convex port (`apps/web/src/lib/auth/auth-user.ts`):
```ts
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

export const getSession = async () => {
  try { return await fetchAuthQuery(api.auth.queries.getSession); }
  catch { return undefined; }
};
export const getUser = async () => (await getSession())?.user;
export const getRequiredUser = async () => {
  const user = await getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
};
export const getRequiredUserOrRedirect = async () => {
  const user = await getUser();
  if (!user) throw redirect({ to: "/signin" });
  return user;
};
```

`getUserLimits` and `getUserLimitsOrRedirect` will fetch from `api.billing.queries.getUserLimits` (Phase 09).

---

## 15. Public-link mutation (server-side validation rules)

`PATCH /api/user/public-link` validates:
```ts
const slugRegex = /^[a-z0-9-]+$/;
schema = z.object({
  enabled: z.boolean(),
  slug: z.string().min(3).max(50).regex(slugRegex).optional().nullable(),
})
```

Business rules:
1. If `enabled && !slug` → 400 "Slug is required when enabling public link"
2. If `enabled && slug` → check uniqueness: `user.findUnique({ where: { publicLinkSlug: slug } })`, if found and `id !== user.id` → 400 "This slug is already taken"
3. Update: `publicLinkEnabled = enabled`, `publicLinkSlug = enabled ? slug : null`

In Convex: port as `authMutation` in `convex/auth/mutations.ts` with Zod validation on the httpAction input and Convex index lookup for slug uniqueness.

---

## 16. User profile mutation

`PATCH /api/user/profile` accepts:
```ts
z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})
```

- `name` → `auth.api.updateUser({ headers, body: { name } })`
- `email` → validates via `EmailChangeSchema` (email format) then `auth.api.changeEmail({ headers, body: { newEmail, callbackURL: "/account" } })`

In Convex: name update stays as an `authMutation` calling `authComponent` to patch the user. Email change triggers the `sendChangeEmailVerification` hook → email.

---

## 17. Unsubscribe endpoint — security bug to fix

**Current:** `POST /api/unsubscribe/$userId` — accepts bare `userId` with NO authentication. Anyone who knows a user's ID can unsubscribe them.

**Fix in Convex (Phase 17 B13):** The Convex `http.ts` unsubscribe route must validate an HMAC-signed token embedded in the unsubscribe URL. The token is generated when sending marketing emails and includes `userId` + a secret. On receipt, verify `HMAC-SHA256(secret, userId) === token` before patching `user.unsubscribed = true`. Do NOT reproduce the current bare-userId pattern.

---

## 18. Target Convex files and function signatures

```
packages/backend/convex/
├── betterAuth/
│   ├── schema.ts          — defineTable for user (with custom fields), session, account,
│   │                        verification, apikey, jwks, rateLimit
│   ├── adapter.ts         — createApi(schema, createAuthOptions)
│   └── data.ts            — getUserById, patchUser (stripeCustomerId, onboarding,
│                            publicLinkSlug, publicLinkEnabled, unsubscribed, metadata)
├── auth/
│   ├── config.ts          — createAuth, authComponent, requireAuth (+ banned check),
│   │                        requireAdmin, createAuthOptions, getSocialProviders
│   │                        ("use node" NOT needed here — no Node APIs)
│   ├── hooks.ts           — onUserCreated (internalMutation), createStripeCustomerAction
│   │                        (internalAction, "use node"), onBeforeDeleteUser
│   │                        (internalAction, "use node"), onAfterDeleteUser (internalAction)
│   ├── queries.ts         — getCurrentUser (query), getSession (query)
│   └── mutations.ts       — updatePublicLink (authMutation), updateProfile (authMutation),
│                            renameApiKey (authMutation), unsubscribe (httpAction with HMAC)
├── auth.config.ts         — getAuthConfigProvider() bridge
├── functions.ts           — authQuery, authMutation, authAction, adminQuery, adminMutation,
│                            adminAction, apiKeyAction (injects { user, apiKey: { id, name } })
├── http.ts                — authComponent.registerRoutes(http, createAuth, { cors: true })
└── utils/
    └── errors.ts          — throwUnauthorized, throwForbidden, throwNotFound,
                             throwValidationError, throwLimitReached
                             (all throw ConvexError<{ code: string, message: string }>)
```

**"use node" requirements:**
- `auth/hooks.ts` (createStripeCustomerAction, onBeforeDeleteUser) — Stripe SDK requires Node
- Any file using `stripe`, `@aws-sdk/*`, `sharp`, or Node crypto for HMAC unsubscribe token

**"use node" NOT required:**
- `auth/config.ts`, `auth/queries.ts`, `auth/mutations.ts`, `betterAuth/adapter.ts` — these run in Convex's edge runtime

---

## 19. Security guards checklist (Phase 17)

| Guard | Current location | Convex target |
|-------|-----------------|---------------|
| Banned user check (server-side) | Not done server-side (only client redirect) | `requireAuth` in `auth/config.ts` after `getSession` |
| Admin role check | `requireAdmin` in `safe-route.ts` | `requireAdmin` in `auth/config.ts` + `adminQuery/Mutation/Action` |
| API key pro-plan gate | `validateApiKey` in `api-key-auth.ts` | `apiKeyAction` builder in `functions.ts` |
| Ownership check on API key rename | `updateMany({ where: { id, userId } })` | `authMutation` with `userId` ownership assert |
| Unsubscribe token | MISSING (bare userId) | HMAC-signed token in Convex httpAction |
| Cookie deduplication | `deduplicateCookies` in `safe-route.ts` | Handled by `@convex-dev/better-auth` internally |
| Error sanitization | `jsonError` in `safe-route.ts` | `throwForbidden/throwNotFound/throwValidationError` via `ConvexError` |
| App Store OTP bypass | `generateOTP` in emailOTP config | `sendVerificationOTP` check on `process.env.APPSTORE_TEST_EMAIL` |
| Admin routes 404 not 403 | `admin.tsx` (frontend only) | Phase 16 §C |
| Public DTO field stripping | `api.v1.public.$slug.bookmarks.ts` | Phase 05 `getByPublicSlug` |

---

## 20. Email templates (verbatim text to preserve)

### OTP email
```
Subject: "SaveIt.now verification code"
Preview: "Your SaveIt.now verification code is {otp}"
Body:
Your verification code is:

**{otp}**

This code expires in 5 minutes. If you didn't request this, please ignore this email.
```
`disabledSignature: true` — no footer signature appended.

### Magic link email
```
Subject: "Sign in to SaveIt.now"
Preview: "Sign in to SaveIt.now"
Body:
Click the link below to sign in to SaveIt.now:

[Sign in to SaveIt.now]({url})

This link expires in 10 minutes. If you didn't request this, please ignore this email.
```
`disabledSignature: true`

### Account deletion confirmation
```
Subject: "Account Deleted"
Preview: "Your account has been deleted"
Body:
It's Melvyn, the founder of SaveIt.now.

I'm sending you this email to confirm that your account has been permanently deleted.

If you have any questions, feel free to reach out at help@saveit.now.
```

### Delete account verification
```
Subject: "Verify Deletion"
Preview: "Confirm your account deletion"
Body:
You requested to delete your account.

Click the link below to confirm the deletion:
[Delete my account]({url})

If you didn't request this, please ignore this email.
```

### Email change verification
```
Subject: "Approve email change"
Preview: "Approve your email change"
Body:
You requested to change your email address from {user.email} to {newEmail}.

Click the link below to approve this change:
[Approve email change]({url})

If you didn't request this change, please ignore this email.
```

---

## 21. Env vars

### Backend (Convex — set via `npx convex env set`)
| Var | Used by |
|-----|---------|
| `BETTER_AUTH_SECRET` | Better Auth signing |
| `BETTER_AUTH_COOKIE_PREFIX` | Must be `save-it` |
| `SITE_URL` | `baseURL` + `trustedOrigins` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated extra origins (Vercel previews, etc.) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple OAuth (mobile) |
| `APPSTORE_TEST_EMAIL` | OTP bypass email (default: `help@saveit.now`) |
| `STRIPE_SECRET_KEY` | Stripe customer creation + sub cancellation |

### Web client (`apps/web/.env`)
| Var | Used by |
|-----|---------|
| `VITE_CONVEX_URL` | ConvexReactClient (WebSocket) |
| `VITE_CONVEX_SITE_URL` | `convexBetterAuthReactStart` (`.convex.site` URL) — NEW, not yet in `vite-env.d.ts` |

### Web server (set on Vercel, consumed server-side)
| Var | Used by |
|-----|---------|
| `VERCEL_ENV` / `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` | `getServerUrl()` |
| `PORT` | Local dev server URL fallback |
| `PLAYWRIGHT_TEST_BASE_URL` | E2E test base URL |

---

## 22. Known gotchas and edge cases

1. **`apiKey` package import**: Must use `@better-auth/api-key` (not `better-auth/plugins`) in BA 1.x. Current code has the wrong import path; the Convex port must correct this.

2. **`reactStartCookies()` is web-framework-specific**: Do NOT port this plugin to the Convex backend. It is fully replaced by `convexBetterAuthReactStart` on the web side.

3. **`convex()` must be last**: Always verify this in code review. Any ordering mistake causes silent session failures.

4. **Custom user fields need `additionalFields`**: Without the `user.additionalFields` block in `createAuthOptions`, the custom fields exist in the DB but are NOT exposed on `session.user`. Both the schema declaration AND `additionalFields` must stay in sync.

5. **Stripe customer ID mismatch in `beforeDelete`**: The current code passes `user.id` to `stripeClient.customers.retrieve()`, which expects a `cus_*` ID. The Convex port must use `user.stripeCustomerId` from the user doc. If `stripeCustomerId` is null (user created before Stripe integration), skip gracefully.

6. **Single `ConvexReactClient` instance**: The web app must have exactly ONE `ConvexReactClient` instance (from router context). The current `providers.tsx` has a module-level `ConvexReactClient` that must be removed in favor of the router-context one to avoid token desync.

7. **Duplicate cookies**: `safe-route.ts` has `deduplicateCookies` logic (keeps LAST occurrence of each cookie key) to handle a known cookie duplication bug. Monitor for similar issues on the Convex side; `@convex-dev/better-auth` may handle this internally.

8. **Redirect URL validation**: The sign-in page uses `getSafeRedirectUrl()` which rejects redirects that don't start with `/` or start with `//`. This must be preserved in the Convex-connected sign-in page to prevent open redirect attacks.

9. **`onboarding` field default**: In `additionalFields`, `onboarding` is `{ type: "boolean", defaultValue: false, required: true }`. Without the `defaultValue`, new users' `onboarding` field would be `undefined` rather than `false`, breaking onboarding flow logic.

10. **`unsubscribed` field**: Only present on the user record, not in `additionalFields` — it's set directly via `prisma.user.update`. In Convex, use `authComponent.safeGetAuthUser` or `betterAuth/data.ts` `patchUser` to set this field, since it's not in `additionalFields`. OR add it to `additionalFields` for consistency — recommended.

11. **New-subscriber drip sequence**: The Inngest job (`marketing-emails-on-new-subscriber.job.ts`) is a multi-step drip with `step.sleep("2h")`, `step.sleep("24h")` waits between emails. In Convex, this becomes a chain of `ctx.scheduler.runAfter` calls with delays in milliseconds. The logic checks bookmark count and extension installation status before deciding which emails to send (conditional branches). See Phase 10 for full drip spec.

12. **`impersonatedBy` in session**: The admin plugin sets `session.impersonatedBy`. The web app reads this in `ChatSnippet` (live chat) and `header-user.tsx` (shows "impersonating" badge). This field must remain on the `session` table in Convex.

13. **`emailAndPassword.enabled: false`**: SaveIt does not use password auth. This must be explicitly disabled in the Convex `createAuthOptions` to prevent Better Auth from exposing password endpoints.
